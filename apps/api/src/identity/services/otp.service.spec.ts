import { randomUUID } from 'node:crypto';
import { OtpService } from './otp.service';

interface ChallengeRow {
  id: string;
  userId: string | null;
  targetPhone: string;
  purpose: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

interface UserRow {
  id: string;
  phone: string;
  status: string;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
}

const OTP_MAX_ATTEMPTS = 5;

/** Emula o subconjunto de PrismaService usado pelo OtpService. */
function makeHarness() {
  const challenges: ChallengeRow[] = [];
  const users = new Map<string, UserRow>();

  const addUser = (id: string, phone: string): void => {
    users.set(id, { id, phone, status: 'PENDING_VERIFICATION', phoneVerifiedAt: null, createdAt: new Date() });
  };

  const prisma = {
    otpChallenge: {
      create: async ({ data }: { data: Partial<ChallengeRow> }): Promise<ChallengeRow> => {
        const row: ChallengeRow = {
          id: randomUUID(),
          userId: null,
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...(data as Omit<
            ChallengeRow,
            'id' | 'attempts' | 'consumedAt' | 'createdAt' | 'userId'
          >),
        };
        challenges.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }: { where: Partial<ChallengeRow>; orderBy?: { createdAt?: 'asc' | 'desc' } }): Promise<ChallengeRow | null> => {
        const matched = challenges.filter(
          (c) =>
            (where.targetPhone === undefined || c.targetPhone === where.targetPhone) &&
            (where.purpose === undefined || c.purpose === where.purpose) &&
            (where.consumedAt === undefined || c.consumedAt === where.consumedAt),
        );
        if (matched.length === 0) return null;
        return orderBy?.createdAt === 'desc' ? matched[matched.length - 1]! : matched[0]!;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<ChallengeRow> }): Promise<ChallengeRow> => {
        const row = challenges.find((c) => c.id === where.id)!;
        return Object.assign(row, data);
      },
      updateMany: async ({ where, data }: { where: Partial<ChallengeRow>; data: Partial<ChallengeRow> }): Promise<{ count: number }> => {
        let count = 0;
        for (const c of challenges) {
          if (
            (where.targetPhone === undefined || c.targetPhone === where.targetPhone) &&
            (where.purpose === undefined || c.purpose === where.purpose) &&
            (where.consumedAt === undefined || c.consumedAt === where.consumedAt)
          ) {
            Object.assign(c, data);
            count++;
          }
        }
        return { count };
      },
    },
    user: {
      findFirst: async ({ where }: { where: { phone: string } }): Promise<UserRow | null> =>
        [...users.values()].find((u) => u.phone === where.phone) ?? null,
      findUnique: async ({ where }: { where: { id: string } }): Promise<UserRow | null> =>
        users.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }): Promise<UserRow> =>
        Object.assign(users.get(where.id)!, data),
    },
  };

  return { service: new OtpService(prisma as never), challenges, users, addUser };
}

describe(OtpService, () => {
  it('emite 6 dígitos, valida e conclui verificação de telefone', async () => {
    const { service, challenges, users, addUser } = makeHarness();
    addUser('u1', '+5511999900001');

    const code = await service.issue('+5511999900001', 'PHONE_VERIFY', 'u1');
    expect(code).toMatch(/^\d{6}$/);
    expect(challenges).toHaveLength(1);

    await expect(service.verify('+5511999900001', 'PHONE_VERIFY', code)).resolves.toEqual({ userId: 'u1' });
    expect(challenges[0]!.consumedAt).toBeInstanceOf(Date);

    await service.completePhoneVerification('u1');
    expect(users.get('u1')?.status).toBe('ACTIVE');
    expect(users.get('u1')?.phoneVerifiedAt).toBeInstanceOf(Date);
  });

  it('código errado incrementa tentativas e não consume o desafio', async () => {
    const { service, challenges, addUser } = makeHarness();
    addUser('u1', '+5511999900002');
    const code = await service.issue('+5511999900002', 'PHONE_VERIFY', 'u1');

    for (let i = 1; i <= 3; i++) {
      await expect(service.verify('+5511999900002', 'PHONE_VERIFY', '000000')).rejects.toMatchObject({ code: 'OTP_INVALIDO' });
      expect(challenges[0]!.attempts).toBe(i);
    }
    await expect(service.verify('+5511999900002', 'PHONE_VERIFY', code)).resolves.toEqual({ userId: 'u1' });
  });

  it(`consome o desafio após ${OTP_MAX_ATTEMPTS} tentativas erradas (429)`, async () => {
    const { service, challenges, addUser } = makeHarness();
    addUser('u1', '+5511999900003');
    const code = await service.issue('+5511999900003', 'PHONE_VERIFY', 'u1');

    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      await expect(service.verify('+5511999900003', 'PHONE_VERIFY', '000000')).rejects.toMatchObject({ code: 'OTP_INVALIDO' });
    }
    await expect(service.verify('+5511999900003', 'PHONE_VERIFY', '000000')).rejects.toMatchObject({ status: 429 });
    expect(challenges[0]!.consumedAt).toBeInstanceOf(Date);

    // desafio consumido → mesmo o código certo volta a falhar
    await expect(service.verify('+5511999900003', 'PHONE_VERIFY', code)).rejects.toMatchObject({ code: 'OTP_INVALIDO' });
  });

  it('expira por tempo (OTP_EXPIRADO)', async () => {
    const { service, challenges } = makeHarness();
    const code = await service.issue('+5511999900004', 'PHONE_VERIFY', null);
    challenges[0]!.expiresAt = new Date(Date.now() - 1_000);
    await expect(service.verify('+5511999900004', 'PHONE_VERIFY', code)).rejects.toMatchObject({ code: 'OTP_EXPIRADO' });
  });

  it('novo desafio invalida o anterior (não-cumulativo)', async () => {
    const { service, addUser } = makeHarness();
    addUser('u1', '+5511999900005');
    const first = await service.issue('+5511999900005', 'PHONE_VERIFY', 'u1');
    const second = await service.issue('+5511999900005', 'PHONE_VERIFY', 'u1');

    await expect(service.verify('+5511999900005', 'PHONE_VERIFY', first)).rejects.toMatchObject({ code: 'OTP_INVALIDO' });
    await expect(service.verify('+5511999900005', 'PHONE_VERIFY', second)).resolves.toEqual({ userId: 'u1' });
  });

  it('resolve o dono do telefone (vínculo no issue)', async () => {
    const { service, addUser } = makeHarness();
    addUser('u1', '+5511999900006');
    await expect(service.resolveUserIdByPhone('+5511999900006')).resolves.toBe('u1');
    await expect(service.resolveUserIdByPhone('+5511999909999')).resolves.toBeNull();
  });
});
