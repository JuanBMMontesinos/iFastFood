/**
 * F2 — Administração de parceiros (backoffice): fila de revisão de KYC,
 * aprovação/recusa, contrato (plano/comissão) e ações de status.
 * Permissões no controller: merchants.read / merchants.write / merchants.block.
 */
import { Injectable } from '@nestjs/common';
import type { Prisma, MerchantStatus as PrismaMerchantStatus } from '@prisma/client';
import {
  assertKycApproved,
  assertMerchantTransition,
  type MerchantStatus,
} from '@ifastfood/domain';
import type {
  MerchantAdminDetail,
  MerchantAdminListItem,
  MerchantContractUpsertInput,
  MerchantStatusActionInput,
  PartnerReviewInput,
} from '@ifastfood/contracts';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../identity/services/audit.service';
import type { RequestMeta } from '../../identity/types';

/** Contrato default quando o backoffice aprova sem definir plano. */
export const DEFAULT_CONTRACT = {
  plan: 'BASIC' as const,
  commissionBps: 1200, // 12% sobre itens
  onlinePaymentFeeBps: 399, // 3,99% no pagamento online
  monthlyFeeCents: 0,
  feeFreeThresholdCents: 0,
  commissionBasis: 'ITEMS' as const,
};

@Injectable()
export class PartnersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: { status?: string; page: number; pageSize: number },
  ): Promise<{ items: MerchantAdminListItem[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } }> {
    const where: Prisma.MerchantWhereInput = query.status
      ? { status: query.status as PrismaMerchantStatus }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          status: true,
          createdAt: true,
          contract: { select: { plan: true } },
          documents: { select: { type: true, status: true } },
        },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      items: rows.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        categoryId: m.categoryId,
        status: m.status,
        plan: m.contract?.plan ?? null,
        kycComplete: assertKycApprovedSafe(m.documents),
        createdAt: m.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async detail(merchantId: string): Promise<MerchantAdminDetail> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        contract: true,
        documents: { orderBy: { type: 'asc' } },
      },
    });
    if (!merchant) throw ApiError.notFound('PARCEIRO_NAO_ENCONTRADO', 'Parceiro não encontrado');
    const docs = merchant.documents.map((d) => ({
      type: d.type,
      fileUrl: d.fileUrl,
      status: d.status,
      rejectReason: d.rejectReason,
      reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
    }));
    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        categoryId: merchant.categoryId,
        status: merchant.status,
        description: merchant.description,
        email: merchant.email,
        phone: merchant.phone,
        logoUrl: merchant.logoUrl,
        coverUrl: merchant.coverUrl,
        orderPrepMinutes: merchant.orderPrepMinutes,
        address: null, // detalhe administrativo: endereço vem no subset do portal
      },
      contract: merchant.contract
        ? {
            plan: merchant.contract.plan,
            commissionBps: merchant.contract.commissionBps,
            onlinePaymentFeeBps: merchant.contract.onlinePaymentFeeBps,
            monthlyFeeCents: merchant.contract.monthlyFeeCents,
            feeFreeThresholdCents: merchant.contract.feeFreeThresholdCents,
            commissionBasis: merchant.contract.commissionBasis,
            signedAt: merchant.contract.signedAt.toISOString(),
          }
        : null,
      staffRole: 'OWNER', // detalhe admin: cargo por staff é consultável via equipe
      kyc: {
        submitted: docs,
        complete: assertKycApprovedSafe(docs),
      },
      documents: docs,
    };
  }

  /** Aprovação: marca documentos pendentes como APPROVED, ativa a loja. */
  async review(
    adminUserId: string,
    merchantId: string,
    input: PartnerReviewInput,
    meta: RequestMeta,
  ): Promise<{ status: MerchantStatus }> {
    const merchant = await this.mustFind(merchantId);

    if (input.decision === 'APPROVE') {
      if (merchant.status !== 'PENDING_REVIEW') {
        throw ApiError.conflict(
          'PARCEIRO_STATUS_ILEGAL',
          `Aprovação exige status PENDING_REVIEW (atual: ${merchant.status})`,
        );
      }

      assertMerchantTransition('PENDING_REVIEW', 'ACTIVE');
      await this.prisma.$transaction(async (tx) => {
        await tx.merchantDocument.updateMany({
          where: { merchantId, status: 'PENDING' },
          data: { status: 'APPROVED', reviewedByUserId: adminUserId, reviewedAt: new Date() },
        });
        const docs = await tx.merchantDocument.findMany({
          where: { merchantId },
          select: { type: true, status: true },
        });
        try {
          assertKycApproved(docs);
        } catch (error) {
          throw ApiError.badRequest(
            'KYC_INCOMPLETO',
            error instanceof Error ? error.message : 'KYC incompleto',
          );
        }
        // Contrato: existente OU default idempotente.
        const contract = await tx.merchantContract.findUnique({ where: { merchantId } });
        if (!contract) {
          await tx.merchantContract.create({ data: { merchantId, ...DEFAULT_CONTRACT } });
        }
        await tx.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } });
      });

      await this.audit.log({
        actorUserId: adminUserId,
        action: 'KYC_APROVADO',
        resourceType: 'Merchant',
        resourceId: merchantId,
        meta,
      });
      return { status: 'ACTIVE' };
    }

    // REJECT → volta para ONBOARDING (corrige e reenvia).
    if (merchant.status !== 'PENDING_REVIEW') {
      throw ApiError.conflict(
        'PARCEIRO_STATUS_ILEGAL',
        `Recusa exige status PENDING_REVIEW (atual: ${merchant.status})`,
      );
    }
    assertMerchantTransition('PENDING_REVIEW', 'ONBOARDING');
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: 'ONBOARDING' },
    });
    await this.audit.log({
      actorUserId: adminUserId,
      action: 'KYC_REPROVADO',
      resourceType: 'Merchant',
      resourceId: merchantId,
      payload: { reason: input.rejectReason },
      meta,
    });
    return { status: 'ONBOARDING' };
  }

  async upsertContract(
    adminUserId: string,
    merchantId: string,
    input: MerchantContractUpsertInput,
    meta: RequestMeta,
  ): Promise<void> {
    const merchant = await this.mustFind(merchantId);
    if (merchant.status === 'CLOSED') {
      throw ApiError.conflict('PARCEIRO_STATUS_ILEGAL', 'Contrato não pode mudar com loja encerrada');
    }
    await this.prisma.merchantContract.upsert({
      where: { merchantId },
      create: { merchantId, ...input },
      update: { ...input },
    });
    await this.audit.log({
      actorUserId: adminUserId,
      action: 'CONTRATO_ATUALIZADO',
      resourceType: 'MerchantContract',
      resourceId: merchantId,
      payload: { plan: input.plan, commissionBps: input.commissionBps },
      meta,
    });
  }

  async statusAction(
    adminUserId: string,
    merchantId: string,
    input: MerchantStatusActionInput,
    meta: RequestMeta,
  ): Promise<{ status: MerchantStatus }> {
    const merchant = await this.mustFind(merchantId);
    const target: MerchantStatus = this.mapAction(input.action);
    assertMerchantTransition(merchant.status, target);
    await this.prisma.merchant.update({ where: { id: merchantId }, data: { status: target } });
    await this.audit.log({
      actorUserId: adminUserId,
      action: `PARCEIRO_${input.action}`,
      resourceType: 'Merchant',
      resourceId: merchantId,
      payload: { from: merchant.status, to: target },
      meta,
    });
    return { status: target };
  }

  private mapAction(action: MerchantStatusActionInput['action']): MerchantStatus {
    switch (action) {
      case 'PAUSE':
        return 'PAUSED';
      case 'RESUME':
      case 'UNBLOCK':
        return 'ACTIVE';
      case 'BLOCK':
        return 'BLOCKED';
      case 'CLOSE':
        return 'CLOSED';
    }
  }

  private async mustFind(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, status: true, name: true },
    });
    if (!merchant) throw ApiError.notFound('PARCEIRO_NAO_ENCONTRADO', 'Parceiro não encontrado');
    return merchant;
  }
}

/** Não-lançável p/ flags de UI em listagens. */
function assertKycApprovedSafe(documents: Array<{ type: string; status: string }>): boolean {
  try {
    assertKycApproved(documents);
    return true;
  } catch {
    return false;
  }
}
