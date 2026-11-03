import { Injectable } from '@nestjs/common';
import type {
  CustomerSignupInput,
  CustomerSignupResponse,
  LoginInput,
  LoginResponse,
  MeResponse,
  TokenPair,
} from '@ifastfood/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { ADMIN_BYPASS_ROLE, LGPD_TERMS_VERSION } from '../config';
import { ALL_PERMISSION_CODES } from '../permissions';
import { PasswordService } from '../crypto/password.service';
import { AuditService } from './audit.service';
import { OtpService } from './otp.service';
import { TotpService } from './totp.service';
import { SessionService } from './session.service';
import type { Principal, RequestMeta } from '../types';

/**
 * Identidade unificada para as quatro personas (cliente, parceiro,
 * entregador, staff) — todas vivem em `users`; papéis/permisssões delineiam
 * o acesso (RBAC). Falhas de login são genéricas (sem user enumeration).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly totp: TotpService,
  ) {}

  /** Cadastro de cliente: duplicidades, consentimento LGPD e OTP de telefone. */
  async signupCustomer(input: CustomerSignupInput, meta: RequestMeta): Promise<CustomerSignupResponse> {
    const email = input.email.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone: input.phone }] },
      select: { email: true },
    });
    if (clash) {
      throw ApiError.conflict(
        'DADOS_EM_USO',
        clash.email === email ? 'E-mail já cadastrado' : 'Telefone já cadastrado',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash: await this.passwords.hash(input.password),
        userType: 'CUSTOMER',
        consents: {
          create: [{ type: 'LGPD_TERMS', version: LGPD_TERMS_VERSION, granted: true }],
        },
        customer: { create: { wallet: { create: {} } } },
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: 'CONTA_CRIADA',
      resourceType: 'User',
      resourceId: user.id,
      payload: { userType: 'CUSTOMER' },
      meta,
    });

    const devCode = await this.otp.issue(input.phone, 'PHONE_VERIFY', user.id);
    const response: CustomerSignupResponse = { userId: user.id, pendingPhoneVerification: true };
    if (process.env.NODE_ENV !== 'production') {
      response.devCode = devCode;
    }
    return response;
  }

  /** Login por e-mail OU telefone; TOTP exigido quando o usuário tem 2FA. */
  async login(input: LoginInput, meta: RequestMeta): Promise<LoginResponse> {
    const identifier = input.emailOrPhone.trim();
    const user = await this.prisma.user.findUnique({
      where: identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: identifier },
    });

    if (!user || !user.passwordHash) {
      await this.audit.log({
        action: 'LOGIN_FALHOU',
        resourceType: 'Auth',
        payload: { reason: 'credencial_ausente' },
        meta,
      });
      throw ApiError.unauthorized();
    }

    if (!(await this.passwords.isMatch(user.passwordHash, input.password))) {
      await this.audit.log({
        actorUserId: user.id,
        action: 'LOGIN_FALHOU',
        resourceType: 'Auth',
        payload: { reason: 'senha_incorreta' },
        meta,
      });
      throw ApiError.unauthorized();
    }

    if (user.twoFactorEnabled) {
      if (!input.totp) {
        return { twoFactorRequired: true };
      }
      const secret = user.twoFactorSecret;
      const twoFactorOk = typeof secret === 'string' && this.totp.verifyForLogin(secret, input.totp);
      if (!twoFactorOk) {
        await this.audit.log({
          actorUserId: user.id,
          action: 'LOGIN_FALHOU',
          resourceType: 'Auth',
          payload: { reason: 'totp_incorreto' },
          meta,
        });
        throw ApiError.unauthorized();
      }
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.log({
        actorUserId: user.id,
        action: 'LOGIN_BLOQUEADO',
        resourceType: 'Auth',
        payload: { status: user.status },
        meta,
      });
      throw ApiError.forbidden(
        user.status === 'PENDING_VERIFICATION'
          ? 'Verifique o telefone para ativar sua conta antes de entrar'
          : 'Conta não está ativa',
        'CONTA_NAO_ATIVA',
      );
    }

    const tokens: TokenPair = await this.sessions.createForLogin(user.id, meta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: 'LOGIN_OK',
      resourceType: 'Auth',
      resourceId: user.id,
      meta,
    });
    return tokens;
  }

  /** Perfil + papéis + permissões efetivas (ADMIN = catálogo completo). */
  async me(principal: Principal): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: { roles: { include: { permissions: true } } },
    });
    if (!user) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }

    const roleNames = user.roles.map((role) => role.name);
    const permissions =
      roleNames.includes(ADMIN_BYPASS_ROLE)
        ? ALL_PERMISSION_CODES
        : [
            ...new Set(
              user.roles.flatMap((role) =>
                role.permissions.map((permission) => permission.code),
              ),
            ),
          ];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      roles: roleNames,
      permissions,
    };
  }
}
