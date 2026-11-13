/**
 * Guarda de escopo do parceiro (F2): garante que o usuário autenticado
 * possui membership (MerchantStaff) e anexa o contexto no request.partner.
 * Cargos exigidos por rota via @RequireStaffRole('OWNER', 'MANAGER').
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import type { Principal } from '../identity/types';

export interface PartnerContext {
  merchantId: string;
  merchantStatus: string;
  merchantName: string;
  staffRole: 'OWNER' | 'MANAGER' | 'OPERATOR';
}

export const STAFF_ROLES_KEY = 'ifastfood:staff-roles';

/** Cargo(s) do MerchantStaff exigidos no endpoint (OWNER > MANAGER > OPERATOR). */
export const RequireStaffRole = (...roles: Array<PartnerContext['staffRole']>) =>
  SetMetadata(STAFF_ROLES_KEY, roles);

/** Contexto do parceiro resolvido pelo guard (merchant + cargo). */
export const Partner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PartnerContext => {
    const request = ctx.switchToHttp().getRequest<Request & { partner?: PartnerContext }>();
    if (!request.partner) {
      throw ApiError.forbidden('Contexto de parceiro não resolvido', 'SEM_LOJA');
    }
    return request.partner;
  },
);

const ROLE_RANK: Record<PartnerContext['staffRole'], number> = {
  OWNER: 3,
  MANAGER: 2,
  OPERATOR: 1,
};

@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { principal?: Principal; partner?: PartnerContext }>();
    const principal = request.principal;
    if (!principal) {
      // Sem JwtAuthGuard antes deste não ocorre; defesa em profundidade.
      throw ApiError.unauthorized('Autenticação ausente', 'TOKEN_AUSENTE');
    }

    const membership = await this.prisma.merchantStaff.findFirst({
      where: { userId: principal.userId },
      include: { merchant: { select: { id: true, status: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) {
      throw ApiError.forbidden('Usuário sem loja vinculada', 'SEM_LOJA');
    }
    if (membership.merchant.status === 'CLOSED') {
      throw ApiError.forbidden('Loja encerrada — procure o suporte', 'LOJA_ENCERRADA');
    }

    const required = this.reflector.getAllAndOverride<Array<PartnerContext['staffRole']>>(
      STAFF_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const staffRole = membership.role as PartnerContext['staffRole'];
    if (required && ROLE_RANK[staffRole] < Math.max(...required.map((r) => ROLE_RANK[r]))) {
      throw ApiError.forbidden(
        `Operação exige cargo ${required.join(' ou ')}`,
        'CARGO_INSUFICIENTE',
      );
    }

    request.partner = {
      merchantId: membership.merchant.id,
      merchantStatus: membership.merchant.status,
      merchantName: membership.merchant.name,
      staffRole,
    };
    return true;
  }
}
