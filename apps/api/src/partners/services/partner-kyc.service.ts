/**
 * F2 — KYC do parceiro: envio dos documentos e conversão de estado.
 * Regra: os 3 tipos obrigatórios são upsert (reenvio substitui o antigo
 * e volta a PENDING); ONBOARDING avança para PENDING_REVIEW.
 */
import { Injectable } from '@nestjs/common';
import { assertMerchantTransition } from '@ifastfood/domain';
import type { KycSubmitInput } from '@ifastfood/contracts';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../identity/services/audit.service';
import type { RequestMeta } from '../../identity/types';
import type { PartnerContext } from '../partner.guard';

@Injectable()
export class PartnerKycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async submit(
    partner: PartnerContext,
    userId: string,
    input: KycSubmitInput,
    meta: RequestMeta,
  ): Promise<{ status: string }> {
    await this.prisma.$transaction(async (tx) => {
      for (const doc of input.documents) {
        await tx.merchantDocument.upsert({
          where: { merchantId_type: { merchantId: partner.merchantId, type: doc.type } },
          create: {
            merchantId: partner.merchantId,
            type: doc.type,
            fileUrl: doc.fileUrl,
          },
          update: {
            fileUrl: doc.fileUrl,
            status: 'PENDING',
            rejectReason: null,
            reviewedAt: null,
            reviewedByUserId: null,
          },
        });
      }
    });

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: partner.merchantId },
      select: { status: true },
    });
    if (merchant?.status === 'ONBOARDING') {
      assertMerchantTransition('ONBOARDING', 'PENDING_REVIEW');
      await this.prisma.merchant.update({
        where: { id: partner.merchantId },
        data: { status: 'PENDING_REVIEW' },
      });
    } else if (merchant?.status !== 'PENDING_REVIEW') {
      throw ApiError.conflict(
        'KYC_JA_FINALIZADO',
        `KYC indisponível no status ${merchant?.status ?? 'desconhecido'}`,
      );
    }

    await this.audit.log({
      actorUserId: userId,
      action: 'KYC_ENVIADO',
      resourceType: 'Merchant',
      resourceId: partner.merchantId,
      payload: { documents: input.documents.map((d) => d.type) },
      meta,
    });

    return { status: 'PENDING_REVIEW' };
  }
}
