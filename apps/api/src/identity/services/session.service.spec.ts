import { randomUUID } from 'node:crypto';
import { TokenService } from '../crypto/token.service';
import { SessionService } from './session.service';

interface SessionRow {
  id: string;
  userId: string;
  familyId: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface TokenRow {
  id: string;
  sessionId: string;
  tokenHash: string;
  replacedBy: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

class FakeAudit {
  logs: Array<{ action: string }> = [];
  async log(entry: { action: string }): Promise<void> {
    this.logs.push(entry);
  }
}

/** Emula o subconjunto de PrismaService usado pelo SessionService. */
function makeHarness() {
  const sessions: SessionRow[] = [];
  const refreshTokens: TokenRow[] = [];
  const audit = new FakeAudit();

  const prisma = {
    session: {
      create: async ({ data }: { data: Omit<SessionRow, 'id' | 'revokedAt' | 'createdAt'> }): Promise<SessionRow> => {
        const row: SessionRow = { id: randomUUID(), revokedAt: null, createdAt: new Date(), ...data } as SessionRow;
        sessions.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }): Promise<SessionRow | null> =>
        sessions.find((s) => s.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<SessionRow> }): Promise<SessionRow> =>
        Object.assign(sessions.find((s) => s.id === where.id)!, data),
      updateMany: async ({ where, data }: { where: { familyId: string; revokedAt: null }; data: { revokedAt: Date } }): Promise<{ count: number }> => {
        let count = 0;
        for (const s of sessions) {
          if (s.familyId === where.familyId && s.revokedAt === null) {
            Object.assign(s, data);
            count++;
          }
        }
        return { count };
      },
    },
    refreshToken: {
      create: async ({ data }: { data: Omit<TokenRow, 'id' | 'revokedAt' | 'createdAt'> }): Promise<TokenRow> => {
        const row: TokenRow = { id: randomUUID(), revokedAt: null, createdAt: new Date(), ...data } as TokenRow;
        refreshTokens.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }): Promise<unknown> => {
        const row = refreshTokens.find((t) => t.tokenHash === where.tokenHash);
        if (!row) return null;
        // emula include: { session: true }
        return { ...row, session: sessions.find((s) => s.id === row.sessionId) };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<TokenRow> }): Promise<TokenRow> =>
        Object.assign(refreshTokens.find((t) => t.id === where.id)!, data),
      updateMany: async ({
        where,
        data,
      }: {
        where: { sessionId?: string; session?: { familyId: string }; revokedAt?: null };
        data: { revokedAt: Date };
      }): Promise<{ count: number }> => {
        let count = 0;
        for (const token of refreshTokens) {
          const session = sessions.find((s) => s.id === token.sessionId);
          const sessionOk = where.session ? session?.familyId === where.session.familyId : true;
          const sessionIdOk = where.sessionId ? token.sessionId === where.sessionId : true;
          if (sessionOk && sessionIdOk && token.revokedAt === null) {
            Object.assign(token, data);
            count++;
          }
        }
        return { count };
      },
    },
    $transaction: async (operations: unknown[]): Promise<unknown> => Promise.all(operations),
  };

  const tokens = new TokenService();
  const service = new SessionService(prisma as never, tokens, audit as never);
  return { service, sessions, refreshTokens, audit, tokens };
}

describe(SessionService, () => {
  it('login cria família + access verificável com claims completos', async () => {
    const { service, tokens } = makeHarness();
    const pair = await service.createForLogin('u1', { ip: '127.0.0.1', userAgent: 'jest' });

    expect(pair.accessExpiresIn).toBe(900);
    const claims = await tokens.verifyAccess(pair.accessToken);
    expect(claims.sub).toBe('u1');
    expect(claims.sid).toBeTruthy();
  });

  it('rotaciona o refresh e quebra o antigo', async () => {
    const { service } = makeHarness();
    const first = await service.createForLogin('u1', {});
    const second = await service.rotate(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessExpiresIn).toBe(900);
  });

  it('reuso de refresh revogado invalida TODA a família (REUSE_DETECTED + auditoria)', async () => {
    const { service, audit } = makeHarness();
    const first = await service.createForLogin('u1', {});
    const second = await service.rotate(first.refreshToken);

    // atacado reapresenta o token antigo já rotacionado:
    await expect(service.rotate(first.refreshToken)).rejects.toMatchObject({
      status: 401,
      code: 'REUSE_DETECTED',
    });
    expect(audit.logs.map((l) => l.action)).toContain('REFRESH_REUSO_DETECTADO');

    // família morta → token legítimo (sucessor) também perde validade:
    await expect(service.rotate(second.refreshToken)).rejects.toMatchObject({ code: 'REUSE_DETECTED' });
  });

  it('logout revoga a sessão do dispositivo (idempotente)', async () => {
    const { service } = makeHarness();
    const pair = await service.createForLogin('u1', {});
    await service.logout(pair.refreshToken);
    await service.logout(pair.refreshToken); // 2ª vez: sem erro

    await expect(service.rotate(pair.refreshToken)).rejects.toMatchObject({ code: 'REUSE_DETECTED' });
  });

  it('refresh expirado cai em SESSAO_EXPIRADA', async () => {
    const { service, refreshTokens } = makeHarness();
    const pair = await service.createForLogin('u1', {});
    refreshTokens[0]!.expiresAt = new Date(Date.now() - 1_000);
    await expect(service.rotate(pair.refreshToken)).rejects.toMatchObject({
      code: 'SESSAO_EXPIRADA',
    });
  });

  it('token de família desconhecida é SESSAO_INVALIDA', async () => {
    const { service } = makeHarness();
    await expect(service.rotate('refresh-lexamente-inexistente')).rejects.toMatchObject({
      code: 'SESSAO_INVALIDA',
    });
  });
});
