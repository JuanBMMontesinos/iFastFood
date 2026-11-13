/**
 * F2 — Equipe da loja (MerchantStaff): convite e remoção.
 * OWNER convite MANAGER/OPERATOR; OWNER é protegido (vínculos OWNER só via
 * backoffice) — evita fazendas de contas com poder de dono.
 */
import { Injectable } from '@nestjs/common';
import type { PartnerStaffInviteInput } from '@ifastfood/contracts';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../identity/services/audit.service';
import { PasswordService } from '../../identity/crypto/password.service';
import type { RequestMeta } from '../../identity/types';
import type { PartnerContext } from '../partner.guard';

@Injectable()
export class PartnerStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async invite(
    partner: PartnerContext,
    userId: string,
    input: PartnerStaffInviteInput,
    meta: RequestMeta,
  ): Promise<{ memberId: string }> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      const alreadyStaff = await this.prisma.merchantStaff.findUnique({
        where: { merchantId_userId: { merchantId: partner.merchantId, userId: existing.id } },
      });
      throw ApiError.conflict(
        'DADOS_EM_USO',
        alreadyStaff ? 'Usuário já faz parte da equipe' : 'E-mail já cadastrado em outra conta',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash: await this.passwords.hash(input.password),
        userType: 'MERCHANT_STAFF',
        status: 'ACTIVE',
        staffPosts: { create: { merchantId: partner.merchantId, role: input.role } },
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'EQUIPE_ADICIONADA',
      resourceType: 'MerchantStaff',
      resourceId: partner.merchantId,
      payload: { memberEmail: email, role: input.role },
      meta,
    });
    return { memberId: user.id };
  }

  async remove(
    partner: PartnerContext,
    userId: string,
    targetUserId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const membership = await this.prisma.merchantStaff.findUnique({
      where: { merchantId_userId: { merchantId: partner.merchantId, userId: targetUserId } },
    });
    if (!membership) {
      throw ApiError.notFound('MEMBRO_NAO_ENCONTRADO', 'Membro não encontrado nesta loja');
    }
    if (membership.role === 'OWNER') {
      throw ApiError.forbidden('Vínculo OWNER é gerenciado pelo backoffice', 'OWNER_PROTEGIDO');
    }
    await this.prisma.merchantStaff.delete({ where: { id: membership.id } });
    await this.audit.log({
      actorUserId: userId,
      action: 'EQUIPE_REMOVIDA',
      resourceType: 'MerchantStaff',
      resourceId: partner.merchantId,
      payload: { memberUserId: targetUserId },
      meta,
    });
  }
}
