import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { PasswordService } from '../crypto/password.service';
import { AuditService } from './audit.service';
import { TotpService } from './totp.service';
import type { RequestMeta } from '../types';

/**
 * DSAR (LGPD art. 18): portabilidade e anonimização.
 * Exportação NUNCA inclui: hash de senha, segredo 2FA, tokens ou dados de
 * terceiros. Anonimização preserva IDs/FKs (integridade histórica de pedidos)
 * e destrói identificadores diretos + revoga consentimentos e sessões.
 */
@Injectable()
export class DsarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly totp: TotpService,
    private readonly audit: AuditService,
  ) {}

  async exportDataForUser(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        consents: { orderBy: { createdAt: 'desc' } },
        roles: { select: { name: true } },
        customer: {
          include: {
            addresses: true,
            wallet: {
              include: { transactions: { take: 50, orderBy: { createdAt: 'desc' } } },
            },
            orders: { take: 50, orderBy: { createdAt: 'desc' } },
            subscriptions: true,
            redemptions: true,
          },
        },
        courier: true,
      },
    });
    if (!user) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }

    const payload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        phoneVerifiedAt: user.phoneVerifiedAt,
      },
      consents: user.consents.map((consent) => ({
        type: consent.type,
        version: consent.version,
        granted: consent.granted,
        createdAt: consent.createdAt,
        revokedAt: consent.revokedAt,
      })),
      roles: user.roles.map((role) => role.name),
    };

    if (user.customer) {
      payload.customer = {
        loyaltyPoints: user.customer.loyaltyPoints,
        birthDate: user.customer.birthDate,
        addresses: user.customer.addresses,
        wallet: user.customer.wallet,
        orders: user.customer.orders,
        subscriptions: user.customer.subscriptions,
        couponRedemptions: user.customer.redemptions,
        document: 'disponível via suporte (armazenamento criptografado)',
      };
    }
    if (user.courier) {
      payload.courier = user.courier;
    }

    await this.audit.log({
      actorUserId: userId,
      action: 'DSAR_EXPORTACAO',
      resourceType: 'User',
      resourceId: userId,
    });
    return payload;
  }

  /** Confirmação (senha + TOTP quando ativo) → anonimização irreversível. */
  async anonymize(
    userId: string,
    input: { password: string; totp?: string },
    meta: RequestMeta,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customer: { select: { id: true } } },
    });
    if (!user) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }
    if (!user.passwordHash || !(await this.passwords.isMatch(user.passwordHash, input.password))) {
      throw ApiError.forbidden('Credenciais inválidas para esta operação', 'CREDENCIAIS_INVALIDAS');
    }
    if (user.twoFactorEnabled) {
      const secret = user.twoFactorSecret;
      const totpOk =
        typeof input.totp === 'string' &&
        typeof secret === 'string' &&
        this.totp.verifyForLogin(secret, input.totp);
      if (!totpOk) {
        throw ApiError.forbidden('Confirme o segundo fator (TOTP) para continuar', 'TOTP_OBRIGATORIO');
      }
    }

    const now = new Date();
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    operations.push(
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: 'REMOVIDO (LGPD)',
          email: null,
          phone: null,
          passwordHash: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          status: 'DELETED',
          lastLoginAt: null,
          customer: user.customer
            ? {
                update: {
                  data: { documentEncrypted: null, birthDate: null, loyaltyPoints: 0 },
                },
              }
            : undefined,
        },
      }),
    );

    if (user.customer) {
      operations.push(
        this.prisma.address.updateMany({
          where: { customerId: user.customer.id },
          data: {
            label: null,
            street: 'REMOVIDO',
            number: '0',
            complement: null,
            district: 'REMOVIDO',
            city: 'REMOVIDO',
            state: '--',
            zipCode: '00000-000',
            lat: 0,
            lng: 0,
            isDefault: false,
          },
        }),
      );
    }

    operations.push(
      this.prisma.consent.updateMany({
        where: { userId },
        data: { granted: false, revokedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session: { userId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    );

    await this.prisma.$transaction(operations);
    await this.audit.log({
      actorUserId: userId,
      action: 'DSAR_ANONIMIZADO',
      resourceType: 'User',
      resourceId: userId,
      meta,
    });
  }
}
