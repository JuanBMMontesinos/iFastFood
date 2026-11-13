import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CourierEarningsDto,
  LedgerEntryDto,
  PayoutDto,
  TriggerPayoutInput,
} from '@ifastfood/contracts';
import {
  buildOrderPaymentLedgerEntries,
  buildPayoutLedgerEntries,
  computeMonthlyFee,
  LEDGER_ACCOUNTS,
} from '@ifastfood/domain';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService implements OnModuleInit {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureLedgerAccounts();
  }

  /**
   * Garante a criação do plano de contas contábil no banco de dados.
   */
  async ensureLedgerAccounts(): Promise<void> {
    const defaultAccounts = [
      { code: LEDGER_ACCOUNTS.GATEWAY_CLEARING, name: 'Gateway em Trânsito (Stripe)', type: 'ASSET' as const },
      { code: LEDGER_ACCOUNTS.BANK_CHECKING, name: 'Conta Corrente Plataforma', type: 'ASSET' as const },
      { code: LEDGER_ACCOUNTS.MERCHANT_PAYABLE, name: 'Repasses a Pagar - Lojistas', type: 'LIABILITY' as const },
      { code: LEDGER_ACCOUNTS.COURIER_PAYABLE, name: 'Repasses a Pagar - Entregadores', type: 'LIABILITY' as const },
      { code: LEDGER_ACCOUNTS.COMMISSION_REVENUE, name: 'Receita de Comissões', type: 'REVENUE' as const },
      { code: LEDGER_ACCOUNTS.SERVICE_FEE_REVENUE, name: 'Receita de Taxa de Serviço', type: 'REVENUE' as const },
      { code: LEDGER_ACCOUNTS.MONTHLY_FEE_REVENUE, name: 'Receita de Mensalidades', type: 'REVENUE' as const },
      { code: LEDGER_ACCOUNTS.GATEWAY_PROCESSING_EXPENSE, name: 'Custo Gateway de Pagamento', type: 'EXPENSE' as const },
    ];

    for (const acc of defaultAccounts) {
      await this.prisma.ledgerAccount.upsert({
        where: { code: acc.code },
        update: {},
        create: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
        },
      });
    }
  }

  /**
   * Registra contabilmente em partidas dobradas o pagamento de um pedido.
   */
  async recordOrderPayment(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: true,
      },
    });

    if (!order) {
      throw ApiError.notFound('ORDER_NOT_FOUND', 'Pedido não encontrado para escrituração contábil.');
    }

    const feeCourierCents = order.delivery?.feeCourierCents ?? 0;
    const orderTotalCents = order.itemsTotalCents + order.deliveryFeeCents;
    const merchantNetCents = orderTotalCents - order.commissionCents - order.processingFeeCents - feeCourierCents;

    const entries = buildOrderPaymentLedgerEntries({
      orderId: order.id,
      customerTotalCents: order.totalCents,
      merchantNetCents: Math.max(0, merchantNetCents),
      commissionCents: order.commissionCents,
      serviceFeeCents: order.serviceFeeCents,
      processingFeeCents: order.processingFeeCents > 0 ? order.processingFeeCents : undefined,
      feeCourierCents: feeCourierCents > 0 ? feeCourierCents : undefined,
    });

    const accountsMap = new Map<string, string>();
    const dbAccounts = await this.prisma.ledgerAccount.findMany({
      where: { code: { in: entries.map((e) => e.accountCode) } },
    });
    for (const a of dbAccounts) {
      accountsMap.set(a.code, a.id);
    }

    for (const entry of entries) {
      const accountId = accountsMap.get(entry.accountCode);
      if (accountId) {
        await this.prisma.ledgerEntry.create({
          data: {
            accountId,
            side: entry.side,
            amountCents: entry.amountCents,
            refType: 'ORDER',
            refId: order.id,
            memo: entry.memo,
          },
        });
      }
    }
  }

  /**
   * Fecha o período e gera o repasse financeiro do lojista (Payout).
   */
  async generateMerchantPayout(input: TriggerPayoutInput): Promise<PayoutDto> {
    const { merchantId } = input;
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { contract: true },
    });

    if (!merchant) {
      throw ApiError.notFound('MERCHANT_NOT_FOUND', 'Parceiro não encontrado.');
    }

    // Busca pedidos entregues no período ainda não vinculados a nenhum payout
    const orders = await this.prisma.order.findMany({
      where: {
        merchantId,
        status: 'DELIVERED',
        deliveredAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        delivery: true,
      },
    });

    if (orders.length === 0) {
      throw ApiError.badRequest('SEM_PEDIDOS', 'Nenhum pedido entregue no período para liquidação.');
    }

    let grossCents = 0;
    let commissionCents = 0;
    let processingFeeCents = 0;

    for (const o of orders) {
      grossCents += o.itemsTotalCents + o.deliveryFeeCents;
      commissionCents += o.commissionCents;
      processingFeeCents += o.processingFeeCents;
    }

    // Mensalidade se faturamento ultrapassar o piso (R$ 1.800)
    const activeContract = merchant.contract;
    const monthlyFeeCents = activeContract
      ? computeMonthlyFee({
          monthlyGrossCents: grossCents,
          monthlyFeeCents: activeContract.monthlyFeeCents,
          feeFreeThresholdCents: activeContract.feeFreeThresholdCents,
        })
      : 0;

    const netCents = Math.max(0, grossCents - commissionCents - processingFeeCents - monthlyFeeCents);

    const payout = await this.prisma.payout.create({
      data: {
        merchantId,
        periodStart,
        periodEnd,
        grossCents,
        commissionCents,
        processingFeeCents,
        monthlyFeeCents,
        netCents,
        status: 'PENDING',
        items: {
          create: orders.map((o) => ({
            orderId: o.id,
            orderItemsCents: o.itemsTotalCents,
            orderDeliveryCents: o.deliveryFeeCents,
            commissionCents: o.commissionCents,
            processingFeeCents: o.processingFeeCents,
            netCents: o.itemsTotalCents + o.deliveryFeeCents - o.commissionCents - o.processingFeeCents,
          })),
        },
      },
      include: { items: true },
    });

    // Lançamentos no Ledger
    const ledgerEntries = buildPayoutLedgerEntries({
      payoutId: payout.id,
      merchantId,
      netCents,
    });

    const accountsMap = new Map<string, string>();
    const dbAccounts = await this.prisma.ledgerAccount.findMany({
      where: { code: { in: ledgerEntries.map((e) => e.accountCode) } },
    });
    for (const a of dbAccounts) {
      accountsMap.set(a.code, a.id);
    }

    for (const e of ledgerEntries) {
      const accountId = accountsMap.get(e.accountCode);
      if (accountId) {
        await this.prisma.ledgerEntry.create({
          data: {
            accountId,
            side: e.side,
            amountCents: e.amountCents,
            refType: 'PAYOUT',
            refId: payout.id,
            memo: e.memo,
          },
        });
      }
    }

    return {
      id: payout.id,
      merchantId: payout.merchantId,
      periodStart: payout.periodStart.toISOString(),
      periodEnd: payout.periodEnd.toISOString(),
      grossCents: payout.grossCents,
      commissionCents: payout.commissionCents,
      processingFeeCents: payout.processingFeeCents,
      monthlyFeeCents: payout.monthlyFeeCents,
      netCents: payout.netCents,
      status: payout.status,
      paidAt: payout.paidAt?.toISOString(),
      items: payout.items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        orderCode: orders.find((o) => o.id === i.orderId)?.code ?? 'IF-PEDIDO',
        orderItemsCents: i.orderItemsCents,
        orderDeliveryCents: i.orderDeliveryCents,
        commissionCents: i.commissionCents,
        processingFeeCents: i.processingFeeCents,
        netCents: i.netCents,
      })),
    };
  }

  /**
   * Extrato de repasses para o Portal do Parceiro.
   */
  async getMerchantPayouts(merchantId: string): Promise<PayoutDto[]> {
    const payouts = await this.prisma.payout.findMany({
      where: { merchantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return payouts.map((p) => ({
      id: p.id,
      merchantId: p.merchantId,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      grossCents: p.grossCents,
      commissionCents: p.commissionCents,
      processingFeeCents: p.processingFeeCents,
      monthlyFeeCents: p.monthlyFeeCents,
      netCents: p.netCents,
      status: p.status,
      paidAt: p.paidAt?.toISOString(),
      items: p.items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        orderCode: 'IF-PEDIDO',
        orderItemsCents: i.orderItemsCents,
        orderDeliveryCents: i.orderDeliveryCents,
        commissionCents: i.commissionCents,
        processingFeeCents: i.processingFeeCents,
        netCents: i.netCents,
      })),
    }));
  }

  /**
   * Extrato de ganhos para o aplicativo do entregador.
   */
  async getCourierEarnings(userId: string): Promise<CourierEarningsDto> {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        courierId: courier.id,
        status: 'DELIVERED',
      },
      include: { order: true },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    });

    const totalDeliveries = deliveries.length;
    const totalEarningsCents = deliveries.reduce((sum, d) => sum + (d.feeCourierCents ?? 0), 0);

    return {
      courierId: courier.id,
      totalDeliveries,
      totalEarningsCents,
      recentDeliveries: deliveries.map((d) => ({
        deliveryId: d.id,
        orderCode: d.order.code,
        distanceKm: Number(d.distanceKm ?? 0),
        feeCourierCents: d.feeCourierCents ?? 0,
        deliveredAt: (d.deliveredAt ?? d.updatedAt).toISOString(),
      })),
    };
  }

  /**
   * Consulta de auditoria do Ledger para o Backoffice.
   */
  async getLedgerEntries(limit = 100): Promise<LedgerEntryDto[]> {
    const entries = await this.prisma.ledgerEntry.findMany({
      include: { account: true },
      orderBy: { postedAt: 'desc' },
      take: limit,
    });

    return entries.map((e) => ({
      id: e.id,
      accountCode: e.account.code,
      accountName: e.account.name,
      side: e.side,
      amountCents: e.amountCents,
      refType: e.refType,
      refId: e.refId,
      memo: e.memo,
      postedAt: e.postedAt.toISOString(),
    }));
  }
}
