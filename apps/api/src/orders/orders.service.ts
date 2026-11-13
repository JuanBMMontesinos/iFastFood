/**
 * F3 — Motor de Pedidos (Orders): Checkout, Precificação no Servidor e Máquina de Estados.
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  assertOrderTransition,
  calculateOrderPricing,
  generateOrderCode,
  type OrderStatus,
} from '@ifastfood/domain';
import type {
  OrderCheckoutInput,
  OrderCheckoutResponse,
  OrderDetailView,
  OrderStatusActionInput,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../identity/services/audit.service';
import type { Principal, RequestMeta } from '../identity/types';
import { CustomerService } from '../customer/customer.service';
import { PaymentsService } from '../payments/payments.service';
import type { PartnerContext } from '../partners/partner.guard';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly customers: CustomerService,
    private readonly payments: PaymentsService,
  ) {}

  /** Checkout completo do pedido com cálculo server-side. */
  async checkout(
    userId: string,
    input: OrderCheckoutInput,
    meta: RequestMeta,
  ): Promise<OrderCheckoutResponse> {
    const customer = await this.customers.getOrCreateCustomer(userId);

    // 1. Validar endereço de entrega pertencente ao cliente
    const address = await this.prisma.address.findUnique({
      where: { id: input.deliveryAddressId },
    });
    if (!address || address.customerId !== customer.id) {
      throw ApiError.badRequest('ENDERECO_INVALIDO', 'Endereço de entrega inválido');
    }

    // 2. Validar parceiro ativo e contrato
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: input.merchantId },
      include: {
        contract: true,
        zones: true,
      },
    });
    if (!merchant || merchant.status !== 'ACTIVE') {
      throw ApiError.badRequest('LOJA_INDISPONIVEL', 'Loja não disponível para pedidos');
    }

    const contractRates = {
      plan: merchant.contract?.plan ?? 'BASIC',
      commissionBasis: merchant.contract?.commissionBasis ?? 'ITEMS',
      commissionBps: merchant.contract?.commissionBps ?? 1200,
      onlinePaymentFeeBps: merchant.contract?.onlinePaymentFeeBps ?? 320,
      monthlyFeeCents: merchant.contract?.monthlyFeeCents ?? 11000,
      feeFreeThresholdCents: merchant.contract?.feeFreeThresholdCents ?? 180000,
    };

    // 3. Validar produtos selecionados
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { menuCategory: true },
    });

    if (products.length !== productIds.length) {
      throw ApiError.badRequest('PRODUTO_INEXISTENTE', 'Um ou mais produtos não existem');
    }

    for (const prod of products) {
      if (prod.menuCategory.merchantId !== merchant.id) {
        throw ApiError.badRequest('PRODUTO_OUTRA_LOJA', 'Produtos pertencem a lojas diferentes');
      }
      if (!prod.active || prod.paused) {
        throw ApiError.badRequest(
          'PRODUTO_INDISPONIVEL',
          `O produto ${prod.name} está pausado ou indisponível`,
        );
      }
    }

    // 4. Montar dados para o cálculo de domínio
    const calculationItems = input.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId)!;
      const unitPriceCents =
        prod.promotionalPriceCents !== null && prod.promotionalPriceCents !== undefined
          ? prod.promotionalPriceCents
          : prod.basePriceCents;

      return {
        productId: prod.id,
        productName: prod.name,
        unitPriceCents,
        quantity: item.quantity,
        options: item.options.map((opt) => ({
          groupName: opt.groupName,
          optionName: opt.optionName,
          priceDeltaCents: opt.priceDeltaCents,
        })),
      };
    });

    // 5. Calcular frete da zona
    const zone = merchant.zones[0]; // seleciona zona principal da loja
    const deliveryFeeCents = zone?.baseFeeCents ?? 500;
    const serviceFeeCents = 149; // R$ 1,49 taxa de serviço padrão

    // 6. Aplicar cupom se houver
    let couponContext = undefined;
    let couponEntity = null;
    if (input.couponCode) {
      couponEntity = await this.prisma.coupon.findUnique({
        where: { code: input.couponCode },
      });
      if (couponEntity && couponEntity.status === 'ACTIVE') {
        const [totalRedemptions, customerRedemptions] = await Promise.all([
          this.prisma.couponRedemption.count({ where: { couponId: couponEntity.id } }),
          this.prisma.couponRedemption.count({
            where: { couponId: couponEntity.id, customerId: customer.id },
          }),
        ]);
        const ordersCount = await this.prisma.order.count({ where: { customerId: customer.id } });

        couponContext = {
          coupon: {
            code: couponEntity.code,
            type: couponEntity.type,
            percentOff: couponEntity.percentOff ?? undefined,
            amountOffCents: couponEntity.amountOffCents ?? undefined,
            maxDiscountCents: couponEntity.maxDiscountCents ?? undefined,
            minOrderCents: couponEntity.minOrderCents ?? undefined,
            validFromIso: couponEntity.validFrom ? couponEntity.validFrom.toISOString() : undefined,
            validUntilIso: couponEntity.validUntil ? couponEntity.validUntil.toISOString() : undefined,
            maxRedemptions: couponEntity.maxRedemptions ?? undefined,
            maxRedemptionsPerCustomer: couponEntity.maxRedemptionsPerCustomer ?? undefined,
            firstOrderOnly: couponEntity.firstOrderOnly,
            applicableCategories: couponEntity.applicableCategories,
          },
          isFirstOrder: ordersCount === 0,
          totalRedemptions,
          customerRedemptions,
          nowIso: new Date().toISOString(),
        };
      }
    }

    const pricing = calculateOrderPricing({
      items: calculationItems,
      deliveryFeeCents,
      serviceFeeCents,
      paymentMode: input.paymentMethod === 'CASH' ? 'STORE' : 'PLATFORM',
      couponContext,
      contract: contractRates,
    });

    // 7. Gerar código único e persistir
    const orderCode = generateOrderCode();

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          code: orderCode,
          customerId: customer.id,
          merchantId: merchant.id,
          deliveryAddressId: address.id,
          status: 'CREATED',
          couponId: couponEntity?.id ?? null,
          discountCents: pricing.discountCents,
          itemsTotalCents: pricing.itemsTotalCents,
          deliveryFeeCents: pricing.deliveryFeeCents,
          serviceFeeCents: pricing.serviceFeeCents,
          totalCents: pricing.totalCents,
          paymentMethod: input.paymentMethod,
          paymentMode: input.paymentMethod === 'CASH' ? 'STORE' : 'PLATFORM',
          contractCommissionBps: contractRates.commissionBps,
          contractOnlinePaymentFeeBps: contractRates.onlinePaymentFeeBps,
          contractCommissionBasis: contractRates.commissionBasis,
          commissionCents: pricing.commissionCents,
          processingFeeCents: pricing.processingFeeCents,
          notes: input.notes,
          items: {
            create: pricing.calculatedItems.map((ci) => ({
              productId: ci.productId,
              productName: ci.productName,
              unitPriceCents: ci.unitPriceCents,
              quantity: ci.quantity,
              itemTotalCents: ci.itemTotalCents,
              options: {
                create: ci.options.map((opt) => ({
                  groupName: opt.groupName,
                  optionName: opt.optionName,
                  priceDeltaCents: opt.priceDeltaCents,
                })),
              },
            })),
          },
          events: {
            create: {
              fromStatus: null,
              toStatus: 'CREATED',
              actorType: 'CUSTOMER',
              actorUserId: userId,
            },
          },
        },
      });

      if (couponEntity && pricing.discountCents > 0) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponEntity.id,
            orderId: createdOrder.id,
            customerId: customer.id,
            discountCents: pricing.discountCents,
          },
        });
      }

      return createdOrder;
    });

    // 8. Inicializar pagamento via Stripe (ou marcar direto para aceite se for dinheiro)
    const paymentResult = await this.payments.createPayment({
      id: order.id,
      code: order.code,
      totalCents: order.totalCents,
      paymentMethod: input.paymentMethod,
    });

    let currentStatus: OrderStatus = 'CREATED';
    if (input.paymentMethod === 'CASH') {
      assertOrderTransition('CREATED', 'PENDING_ACCEPTANCE');
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PENDING_ACCEPTANCE' },
      });
      await this.prisma.orderEventOrderState.create({
        data: {
          orderId: order.id,
          fromStatus: 'CREATED',
          toStatus: 'PENDING_ACCEPTANCE',
          actorType: 'SYSTEM',
          payload: { reason: 'PAGAMENTO_EM_DINHEIRO' },
        },
      });
      currentStatus = 'PENDING_ACCEPTANCE';
    }

    await this.audit.log({
      actorUserId: userId,
      action: 'PEDIDO_CRIADO',
      resourceType: 'Order',
      resourceId: order.id,
      payload: { code: order.code, totalCents: order.totalCents },
      meta,
    });

    return {
      orderId: order.id,
      code: order.code,
      status: currentStatus,
      totalCents: order.totalCents,
      itemsTotalCents: order.itemsTotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      serviceFeeCents: order.serviceFeeCents,
      discountCents: order.discountCents,
      stripeClientSecret: paymentResult.clientSecret,
    };
  }

  /** Transições de status do pedido (Aceite, Preparo, Despacho, Entrega, Cancelamento). */
  async statusAction(
    orderId: string,
    input: OrderStatusActionInput,
    actor: { type: 'CUSTOMER' | 'MERCHANT' | 'STAFF' | 'SYSTEM'; userId?: string },
    meta: RequestMeta,
  ): Promise<{ status: OrderStatus }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, merchant: { include: { staff: true } } },
    });
    if (!order) {
      throw ApiError.notFound('PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado');
    }

    const targetStatus = this.mapActionToTargetStatus(input.action);

    // Validações de permissão do autor da ação
    if (actor.type === 'CUSTOMER') {
      if (order.customer.userId !== actor.userId) {
        throw ApiError.forbidden('Acesso negado ao pedido', 'ACESSO_NEGADO');
      }
      if (input.action !== 'CANCEL') {
        throw ApiError.forbidden('Cliente só pode cancelar pedidos', 'OPERACAO_ILEGAL');
      }
      if (order.status !== 'CREATED' && order.status !== 'PENDING_ACCEPTANCE') {
        throw ApiError.conflict(
          'CANCELAMENTO_INDISPONIVEL',
          'Não é possível cancelar pedido após aceite da loja',
        );
      }
    } else if (actor.type === 'MERCHANT') {
      const isStaff = order.merchant.staff.some((s) => s.userId === actor.userId);
      if (!isStaff) {
        throw ApiError.forbidden('Usuário não pertence à equipe da loja', 'ACESSO_NEGADO');
      }
    }

    // Valida a transição na máquina de estado do domínio
    assertOrderTransition(order.status as OrderStatus, targetStatus);

    const updateData: Prisma.OrderUpdateInput = { status: targetStatus };
    const now = new Date();

    if (targetStatus === 'ACCEPTED') updateData.confirmedAt = now;
    if (targetStatus === 'READY_FOR_PICKUP') updateData.readyAt = now;
    if (targetStatus === 'DISPATCHED') updateData.dispatchedAt = now;
    if (targetStatus === 'DELIVERED') updateData.deliveredAt = now;
    if (targetStatus === 'CANCELED' || targetStatus === 'REJECTED') {
      updateData.canceledAt = now;
      updateData.cancelReason = input.reason ?? `Ação ${input.action}`;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      await tx.orderEventOrderState.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: targetStatus,
          actorType: actor.type,
          actorUserId: actor.userId,
          payload: input.reason ? { reason: input.reason } : undefined,
        },
      });
    });

    // Se foi cancelado/rejeitado e pago online, aciona estorno
    if (targetStatus === 'CANCELED' || targetStatus === 'REJECTED') {
      await this.payments.refundPayment(order.id, input.reason ?? 'Pedido cancelado/rejeitado');
    }

    await this.audit.log({
      actorUserId: actor.userId,
      action: `PEDIDO_${input.action}`,
      resourceType: 'Order',
      resourceId: order.id,
      payload: { from: order.status, to: targetStatus },
      meta,
    });

    return { status: targetStatus };
  }

  /** Histórico de pedidos do cliente. */
  async getMyOrders(userId: string): Promise<OrderDetailView[]> {
    const customer = await this.customers.getOrCreateCustomer(userId);
    const orders = await this.prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { placedAt: 'desc' },
      include: {
        merchant: { select: { id: true, name: true, phone: true, logoUrl: true } },
        deliveryAddress: true,
        items: { include: { options: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    return orders.map((o) => this.mapOrderDetail(o));
  }

  /** Detalhes de um pedido por ID (com autorização de acesso). */
  async getOrderById(orderId: string, principal: Principal): Promise<OrderDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        merchant: {
          include: { staff: true },
        },
        deliveryAddress: true,
        items: { include: { options: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw ApiError.notFound('PEDIDO_NAO_ENCONTRADO', 'Pedido não encontrado');
    }

    const isCustomer = order.customer.userId === principal.userId;
    const isStaff = order.merchant.staff.some((s) => s.userId === principal.userId);
    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      select: { userType: true },
    });
    const isAdmin = user?.userType === 'STAFF';

    if (!isCustomer && !isStaff && !isAdmin) {
      throw ApiError.forbidden('Acesso negado a este pedido', 'ACESSO_NEGADO');
    }

    return this.mapOrderDetail(order);
  }

  /** Gestor de Pedidos (Portal do Parceiro): lista pedidos ativos da loja. */
  async getMerchantOrders(partner: PartnerContext): Promise<OrderDetailView[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        merchantId: partner.merchantId,
        status: {
          in: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DISPATCHED', 'IN_DELIVERY'],
        },
      },
      orderBy: { placedAt: 'asc' },
      include: {
        merchant: { select: { id: true, name: true, phone: true, logoUrl: true } },
        deliveryAddress: true,
        items: { include: { options: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    return orders.map((o) => this.mapOrderDetail(o));
  }

  private mapActionToTargetStatus(action: OrderStatusActionInput['action']): OrderStatus {
    switch (action) {
      case 'ACCEPT':
        return 'ACCEPTED';
      case 'REJECT':
        return 'REJECTED';
      case 'PREPARE':
        return 'IN_PREPARATION';
      case 'READY':
        return 'READY_FOR_PICKUP';
      case 'DISPATCH':
        return 'DISPATCHED';
      case 'DELIVER':
        return 'DELIVERED';
      case 'CANCEL':
        return 'CANCELED';
    }
  }

  private mapOrderDetail(o: any): OrderDetailView {
    return {
      id: o.id,
      code: o.code,
      status: o.status,
      merchant: {
        id: o.merchant.id,
        name: o.merchant.name,
        phone: o.merchant.phone,
        logoUrl: o.merchant.logoUrl,
      },
      deliveryAddress: o.deliveryAddress
        ? {
            street: o.deliveryAddress.street,
            number: o.deliveryAddress.number,
            complement: o.deliveryAddress.complement,
            district: o.deliveryAddress.district,
            city: o.deliveryAddress.city,
            state: o.deliveryAddress.state,
          }
        : null,
      items: o.items.map((i: any) => {
        const opts = Array.isArray(i.options)
          ? i.options
          : Array.isArray(i.options?.create)
            ? i.options.create
            : [];
        return {
          id: i.id ?? 'item-id',
          productId: i.productId,
          productName: i.productName,
          unitPriceCents: i.unitPriceCents,
          quantity: i.quantity,
          itemTotalCents: i.itemTotalCents,
          notes: i.notes,
          options: opts.map((opt: any) => ({
            id: opt.id ?? 'opt-id',
            groupName: opt.groupName,
            optionName: opt.optionName,
            priceDeltaCents: opt.priceDeltaCents,
          })),
        };
      }),
      events: o.events.map((e: any) => ({
        id: e.id ?? 'event-id',
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorType: e.actorType,
        actorUserId: e.actorUserId,
        createdAt: e.createdAt ? (e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt)) : new Date().toISOString(),
      })),
      paymentMethod: o.paymentMethod,
      itemsTotalCents: o.itemsTotalCents,
      deliveryFeeCents: o.deliveryFeeCents,
      serviceFeeCents: o.serviceFeeCents,
      discountCents: o.discountCents,
      totalCents: o.totalCents,
      placedAt: o.placedAt.toISOString(),
      confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
      readyAt: o.readyAt ? o.readyAt.toISOString() : null,
      dispatchedAt: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
      deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
      canceledAt: o.canceledAt ? o.canceledAt.toISOString() : null,
      cancelReason: o.cancelReason,
    };
  }
}
