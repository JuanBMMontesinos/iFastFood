import { Injectable, Logger } from '@nestjs/common';
import {
  AdminDashboardMetricsDto,
  KycQueueItemDto,
  ReviewKycInput,
} from '@ifastfood/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/api-error';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Métricas executivas em tempo real a partir das tabelas no Supabase.
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetricsDto> {
    const [orderAgg, activeCouriers, activeMerchants, pendingMerchants, pendingCouriers] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { status: 'DELIVERED' },
          _sum: {
            totalCents: true,
            commissionCents: true,
            serviceFeeCents: true,
          },
          _count: { id: true },
        }),
        this.prisma.courier.count({
          where: { status: 'APPROVED' },
        }),
        this.prisma.merchant.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.merchant.count({
          where: { status: 'PENDING_REVIEW' },
        }),
        this.prisma.courier.count({
          where: { status: 'PENDING_REVIEW' },
        }),
      ]);

    const gmvCents = orderAgg._sum.totalCents ?? 0;
    const netRevenueCents =
      (orderAgg._sum.commissionCents ?? 0) + (orderAgg._sum.serviceFeeCents ?? 0);
    const deliveredOrdersCount = orderAgg._count.id;
    const pendingKycCount = pendingMerchants + pendingCouriers;

    return {
      gmvCents,
      netRevenueCents,
      deliveredOrdersCount,
      activeCouriersCount: activeCouriers,
      activeMerchantsCount: activeMerchants,
      pendingKycCount,
    };
  }

  /**
   * Fila operacional unificada de KYC (Restaurantes + Entregadores pendentes).
   */
  async getKycQueue(): Promise<KycQueueItemDto[]> {
    const [pendingMerchants, pendingCouriers] = await Promise.all([
      this.prisma.merchant.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: { documents: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courier.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: { user: true, documents: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const merchantItems: KycQueueItemDto[] = pendingMerchants.map((m) => ({
      id: m.id,
      name: m.name,
      type: 'MERCHANT',
      document: m.documentEncrypted || 'CNPJ Pendente',
      submittedAt: m.createdAt.toISOString(),
      status: m.status,
      details: `${m.documents.length} documento(s) anexado(s) - ${m.city ?? 'SP'}`,
    }));

    const courierItems: KycQueueItemDto[] = pendingCouriers.map((c) => ({
      id: c.id,
      name: c.user?.name ?? 'Entregador Parceiro',
      type: 'COURIER',
      document: c.plate ? `Placa: ${c.plate} (${c.vehicleType})` : `Veículo: ${c.vehicleType}`,
      submittedAt: c.createdAt.toISOString(),
      status: c.status,
      details: `${c.documents.length} documento(s) CNH/Selfie anexados`,
    }));

    return [...merchantItems, ...courierItems];
  }

  /**
   * Homologação ou Rejeição de Restaurante na fila de KYC.
   */
  async reviewMerchant(merchantId: string, input: ReviewKycInput) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw ApiError.notFound('MERCHANT_NOT_FOUND', 'Restaurante não encontrado.');
    }

    const nextStatus = input.decision === 'APPROVE' ? 'ACTIVE' : 'BLOCKED';
    const docStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await this.prisma.$transaction([
      this.prisma.merchant.update({
        where: { id: merchantId },
        data: { status: nextStatus },
      }),
      this.prisma.merchantDocument.updateMany({
        where: { merchantId, status: 'PENDING' },
        data: {
          status: docStatus,
          reviewedAt: new Date(),
          rejectReason: input.decision === 'REJECT' ? input.notes : null,
        },
      }),
    ]);

    this.logger.log(`Restaurante ${merchant.name} (${merchantId}) revisado com decisão: ${input.decision}`);
    return { success: true, merchantId, status: nextStatus };
  }

  /**
   * Homologação ou Rejeição de Entregador na fila de KYC.
   */
  async reviewCourier(courierId: string, input: ReviewKycInput) {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    const nextStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'BLOCKED';
    const docStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await this.prisma.$transaction([
      this.prisma.courier.update({
        where: { id: courierId },
        data: { status: nextStatus },
      }),
      this.prisma.courierDocument.updateMany({
        where: { courierId, status: 'PENDING' },
        data: {
          status: docStatus,
          reviewedAt: new Date(),
          rejectReason: input.decision === 'REJECT' ? input.notes : null,
        },
      }),
    ]);

    this.logger.log(`Entregador ${courierId} revisado com decisão: ${input.decision}`);
    return { success: true, courierId, status: nextStatus };
  }
}
