/**
 * F3 — Regras de precificação e cálculo do pedido.
 * Tudo em centavos inteiros (MoneyCents). Nenhum float.
 */
import { DomainError } from '../domain-error';
import { computeOrderFees, type MerchantContractRates, type PaymentMode } from '../finance/tax-rules';
import { evaluateCoupon, type CouponShape } from '../marketing/coupon';

export interface OrderItemOptionSelection {
  groupName: string;
  optionName: string;
  priceDeltaCents: number;
}

export interface OrderItemCalculationInput {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  options: OrderItemOptionSelection[];
}

export interface OrderPricingInput {
  items: OrderItemCalculationInput[];
  deliveryFeeCents: number;
  serviceFeeCents: number;
  paymentMode?: PaymentMode;
  couponContext?: {
    coupon: CouponShape;
    isFirstOrder: boolean;
    totalRedemptions: number;
    customerRedemptions: number;
    nowIso: string;
    orderCategoryCode?: string;
  };
  contract: MerchantContractRates;
}

export interface OrderPricingResult {
  itemsTotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalCents: number;
  commissionCents: number;
  processingFeeCents: number;
  calculatedItems: Array<{
    productId: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    itemTotalCents: number;
    options: OrderItemOptionSelection[];
  }>;
}

export function calculateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  if (input.items.length === 0) {
    throw new DomainError('Pedido deve conter pelo menos um item');
  }

  let itemsTotalCents = 0;
  const calculatedItems = input.items.map((item) => {
    if (item.quantity <= 0) {
      throw new DomainError(`Quantidade do item ${item.productName} deve ser maior que zero`);
    }
    const optionsDelta = item.options.reduce((sum, opt) => sum + opt.priceDeltaCents, 0);
    const unitPriceWithOpts = item.unitPriceCents + optionsDelta;
    if (unitPriceWithOpts < 0) {
      throw new DomainError(`Preço unitário com complementos não pode ser negativo`);
    }
    const itemTotalCents = unitPriceWithOpts * item.quantity;
    itemsTotalCents += itemTotalCents;

    return {
      productId: item.productId,
      productName: item.productName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      itemTotalCents,
      options: item.options,
    };
  });

  let discountCents = 0;
  let finalDeliveryFeeCents = input.deliveryFeeCents;

  if (input.couponContext) {
    const evalRes = evaluateCoupon({
      coupon: input.couponContext.coupon,
      orderItemsCents: itemsTotalCents,
      deliveryFeeCents: input.deliveryFeeCents,
      isFirstOrder: input.couponContext.isFirstOrder,
      totalRedemptions: input.couponContext.totalRedemptions,
      customerRedemptions: input.couponContext.customerRedemptions,
      nowIso: input.couponContext.nowIso,
      orderCategoryCode: input.couponContext.orderCategoryCode,
    });

    if (evalRes.valid) {
      discountCents = evalRes.discountCents;
      if (evalRes.freeDelivery) {
        finalDeliveryFeeCents = 0;
      }
    } else {
      throw new DomainError(`Cupom inválido: ${evalRes.reason}`);
    }
  }

  const subtotal = itemsTotalCents + finalDeliveryFeeCents + input.serviceFeeCents;
  const totalCents = Math.max(0, subtotal - discountCents);

  const feeBreakdown = computeOrderFees({
    itemsTotalCents,
    deliveryFeeCents: finalDeliveryFeeCents,
    paymentMode: input.paymentMode ?? 'PLATFORM',
    contract: input.contract,
  });

  return {
    itemsTotalCents,
    deliveryFeeCents: finalDeliveryFeeCents,
    serviceFeeCents: input.serviceFeeCents,
    discountCents,
    totalCents,
    commissionCents: feeBreakdown.commissionCents,
    processingFeeCents: feeBreakdown.paymentProcessingFeeCents,
    calculatedItems,
  };
}

/** Gera código de 5 caracteres amigável para exibição ao cliente e loja (ex.: IF-7K3N9). */
export function generateOrderCode(randomSeed = Math.random()): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let n = Math.floor(randomSeed * 1000000000);
  for (let i = 0; i < 5; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `IF-${code}`;
}
