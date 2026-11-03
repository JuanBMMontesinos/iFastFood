import { FieldCipher } from '../crypto/field-cipher';
import { PasswordService } from '../crypto/password.service';
import { TokenService } from '../crypto/token.service';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { DsarService } from '../services/dsar.service';
import { OtpService } from '../services/otp.service';
import { SessionService } from '../services/session.service';
import { TotpService } from '../services/totp.service';
import { UsersAdminService } from '../services/users-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { TokenPair } from '@ifastfood/contracts';

/**
 * Integração REAL contra Postgres (docker local por padrão).
 * Pulada com aviso quando o banco não está disponível — unitários cobrem
 * os mesmos caminhos com fakes; este arquivo garante queries/SQL verdadeiras.
 *
 * Env opcional: TEST_DATABASE_URL
 */

jest.setTimeout(60_000);

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://ifastfood:ifastfood_dev@localhost:5432/ifastfood?schema=public';

let prisma!: PrismaService;
let dbReady = false;

const passwords = new PasswordService();
const tokenService = new TokenService();
let auth!: AuthService;
let otp!: OtpService;
let sessionService!: SessionService;
let adminService!: UsersAdminService;
let dsarService!: DsarService;

/** Registra o teste; se o banco não estiver de pé, executa como skip visível. */
function testDb(name: string, fn: () => Promise<void>): void {
  it(name, async () => {
    if (!dbReady) {
      process.stdout.write(`[skip] ${name} — Postgres local indisponível\n`);
      return;
    }
    await fn();
  });
}

/** Mesma projeção que o JwtAuthGuard faz dos claims para o request.principal. */
function toPrincipal(claims: { sub: string; sid: string; fam: string }) {
  return { userId: claims.sub, sessionId: claims.sid, familyId: claims.fam };
}

beforeAll(async () => {
  prisma = new PrismaService({ datasources: { db: { url: TEST_DB_URL } } });
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4_000)),
    ]);
    dbReady = true;
  } catch {
    dbReady = false;
  }
  if (!dbReady) {
    return;
  }

  const audit = new AuditService(prisma);
  otp = new OtpService(prisma);
  const totp = new TotpService(prisma, audit, new FieldCipher());
  sessionService = new SessionService(prisma, tokenService, audit);
  auth = new AuthService(prisma, passwords, sessionService, audit, otp, totp);
  adminService = new UsersAdminService(prisma, passwords, audit);
  dsarService = new DsarService(prisma, passwords, totp, audit);
});

beforeEach(async () => {
  if (!dbReady) return;
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "Customer", "Wallet", "Address", "Session", "RefreshToken", ' +
      '"OtpChallenge", "AuditLog", "Consent", "Role", "Permission", "_RoleToUser", "_PermissionToRole" ' +
      'RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  if (dbReady) {
    await prisma.$disconnect();
  }
});

const PASSWORD = 'S3nh4Segura!';

testDb('fluxo cliente completo: signup → OTP → login → rotação → reuso → logout → me', async () => {
  const email = 'ana@ifastfood.test';
  const phone = '+5511999900001';

  const signup = await auth.signupCustomer(
    { name: 'Ana Cliente', email, phone, password: PASSWORD, acceptedLgpd: true },
    { ip: '127.0.0.1', userAgent: 'jest' },
  );
  expect(signup.pendingPhoneVerification).toBe(true);
  expect(signup.devCode).toMatch(/^\d{6}$/);

  // conta pendente NÃO entra:
  await expect(
    auth.login({ emailOrPhone: email, password: PASSWORD }, {}),
  ).rejects.toMatchObject({ code: 'CONTA_NAO_ATIVA' });

  // verificação de telefone ativa a conta:
  const verification = await otp.verify(phone, 'PHONE_VERIFY', signup.devCode!);
  expect(verification.userId).toBe(signup.userId);
  await otp.completePhoneVerification(signup.userId);

  const first = (await auth.login(
    { emailOrPhone: phone, password: PASSWORD },
    {},
  )) as TokenPair;
  expect(first.accessExpiresIn).toBe(900);
  const claims = await tokenService.verifyAccess(first.accessToken);
  expect(claims.sub).toBe(signup.userId);
  // rotação gera par novo:
  const second = await sessionService.rotate(first.refreshToken);
  expect(second.refreshToken).not.toBe(first.refreshToken);

  // reuso do antigo mata a família:
  await expect(sessionService.rotate(first.refreshToken)).rejects.toMatchObject({
    code: 'REUSE_DETECTED',
  });
  await expect(sessionService.rotate(second.refreshToken)).rejects.toMatchObject({
    code: 'REUSE_DETECTED',
  });

  // relógio continua vivo: novo login → /me
  const third = (await auth.login({ emailOrPhone: email, password: PASSWORD }, {})) as TokenPair;
  const profile = await auth.me(toPrincipal(await tokenService.verifyAccess(third.accessToken)));
  expect(profile).toMatchObject({ name: 'Ana Cliente', userType: 'CUSTOMER', status: 'ACTIVE' });
  expect(profile.roles).toEqual([]);

  await sessionService.logout(third.refreshToken);
  await expect(sessionService.rotate(third.refreshToken)).rejects.toMatchObject({
    code: 'REUSE_DETECTED',
  });

  // duplicidade de e-mail/telefone rejeitada:
  await expect(
    auth.signupCustomer(
      { name: 'Ana Cliente', email, phone: '+5511999900099', password: PASSWORD, acceptedLgpd: true },
      {},
    ),
  ).rejects.toMatchObject({ code: 'DADOS_EM_USO' });
});

testDb('LGPD DSAR: exportação sem segredos + anonimização irreversível', async () => {
  const email = 'leo@ifastfood.test';
  const phone = '+5511999900002';
  const signup = await auth.signupCustomer(
    { name: 'Leo Cliente', email, phone, password: PASSWORD, acceptedLgpd: true },
    {},
  );
  const verification = await otp.verify(phone, 'PHONE_VERIFY', signup.devCode!);
  await otp.completePhoneVerification(verification.userId!);

  const customer = await prisma.customer.findFirst({ where: { userId: signup.userId } });
  await prisma.address.create({
    data: {
      customerId: customer!.id,
      label: 'Casa',
      street: 'Rua X',
      number: '10',
      district: 'Centro',
      city: 'SP',
      state: 'SP',
      zipCode: '01001-000',
      lat: -23.55,
      lng: -46.63,
    },
  });

  const exported = (await dsarService.exportDataForUser(signup.userId)) as {
    user: { name: string };
    customer?: { addresses: unknown[] };
  };
  expect(exported.user.name).toBe('Leo Cliente');
  expect(exported.customer?.addresses).toHaveLength(1);
  const serialized = JSON.stringify(exported);
  expect(serialized).not.toContain('$argon2'); // hash nunca exportado
  expect(serialized).not.toContain(signup.devCode!);

  await dsarService.anonymize(signup.userId, { password: PASSWORD }, {});

  const anonymized = await prisma.user.findUnique({ where: { id: signup.userId } });
  expect(anonymized).toMatchObject({
    name: 'REMOVIDO (LGPD)',
    email: null,
    phone: null,
    status: 'DELETED',
  });
  const address = await prisma.address.findFirst({ where: { customerId: customer!.id } });
  expect(address?.street).toBe('REMOVIDO');

  // login pós-anonimização falha (credencial apagada).
  await expect(auth.login({ emailOrPhone: email, password: PASSWORD }, {})).rejects.toMatchObject({
    status: 401,
  });
});

testDb('RBAC: staff com papel OPS + bloqueio de auto-escalação para ADMIN', async () => {
  const permissions = {
    read: await prisma.permission.create({ data: { code: 'users.read', description: 'ler' } }),
    write: await prisma.permission.create({ data: { code: 'users.write', description: 'escrever' } }),
    adminWrite: await prisma.permission.create({
      data: { code: 'admin.write', description: 'admin' },
    }),
  };
  await prisma.role.create({
    data: {
      name: 'OPS',
      isSystem: true,
      permissions: { connect: [{ id: permissions.read.id }, { id: permissions.write.id }] },
    },
  });
  const argonHash = await passwords.hash(PASSWORD);
  const root = await prisma.user.create({
    data: {
      name: 'Root Admin',
      email: 'root@ifastfood.test',
      passwordHash: argonHash,
      userType: 'STAFF',
      status: 'ACTIVE',
      roles: {
        create: {
          name: 'ADMIN',
          isSystem: true,
          permissions: { connect: [{ id: permissions.adminWrite.id }] },
        },
      },
    },
  });

  const staff = await adminService.createStaff(
    { name: 'Ops Primeiro', email: 'ops@ifastfood.test', password: PASSWORD, roleName: 'OPS' },
    root.id,
    {},
  );
  expect(staff).toMatchObject({ userType: 'STAFF', status: 'ACTIVE', roleNames: ['OPS'] });

  const login = (await auth.login(
    { emailOrPhone: 'ops@ifastfood.test', password: PASSWORD },
    {},
  )) as TokenPair;
  const principal = toPrincipal(await tokenService.verifyAccess(login.accessToken));
  const profile = await auth.me(principal);
  expect(profile.permissions.sort()).toEqual(['users.read', 'users.write']);
  expect(profile.roles).toEqual(['OPS']);

  // staff OPS tenta criar ADMIN → bloqueado (não tem admin.write)
  await expect(
    adminService.createStaff(
      { name: 'Novo Admin', email: 'novo.admin@ifastfood.test', password: PASSWORD, roleName: 'ADMIN' },
      staff.id,
      {},
    ),
  ).rejects.toMatchObject({ code: 'ESCALACAO_NEGADA', status: 403 });
});
