/**
 * Motor de cupons — usado no checkout do cliente e no admin de Marketing.
 * Tipos: PERCENTAGE (com teto), FIXED, FREE_DELIVERY.
 * Restrições: janela de validade, pedido mínimo, limite total,
 * limite por cliente, exclusivo para primeiro pedido e elegibilidade por categoria.
 */
import { DomainError } from '../domain-error';
import { MoneyCents } from '../money';

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY';

export type CouponRejectionReason =
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER_NOT_REACHED'
  | 'USAGE_LIMIT_REACHED'
  | 'PER_CUSTOMER_LIMIT_REACHED'
  | 'FIRST_ORDER_ONLY'
  | 'CATEGORY_NOT_ELIGIBLE';

export interface CouponShape {
  code: string;
  type: CouponType;
  /** Somente PERCENTAGE: 1–100. */
  percentOff?: number;
  /** Somente FIXED, em centavos. */
  amountOffCents?: MoneyCents;
  /** Teto do desconto (PERCENTAGE/FIXED), em centavos. */
  maxDiscountCents?: MoneyCents;
  minOrderCents?: MoneyCents;
  validFromIso?: string;
  validUntilIso?: string;
  maxRedemptions?: number;
  maxRedemptionsPerCustomer?: number;
  firstOrderOnly?: boolean;
  /** Códigos de categoria elegíveis; vazio = todas. */
  applicableCategories?: string[];
}

export interface CouponEvaluationInput {
  coupon: CouponShape;
  /** Itens do pedido (sem entrega) — pedido mínimo e desconto incidem aqui. */
  orderItemsCents: MoneyCents;
  deliveryFeeCents: MoneyCents;
  isFirstOrder: boolean;
  totalRedemptions: number;
  customerRedemptions: number;
  nowIso: string;
  orderCategoryCode?: string;
}

export type CouponEvaluation =
  | { valid: true; discountCents: MoneyCents; freeDelivery: boolean }
  | { valid: false; reason: CouponRejectionReason };

/**
 * Regra de precedência (igual ao checkout no mercado):
 * 1. limites de uso → 2. janela temporal → 3. pedido mínimo
 * → 4. primeiro pedido → 5. categoria → cálculo do desconto.
 */
export function evaluateCoupon(input: CouponEvaluationInput): CouponEvaluation {
  const { coupon, orderItemsCents, deliveryFeeCents } = input;

  if (orderItemsCents < 0) {
    throw new DomainError('orderItemsCents não pode ser negativo');
  }

  if (coupon.maxRedemptions !== undefined && input.totalRedemptions >= coupon.maxRedemptions) {
    return { valid: false, reason: 'USAGE_LIMIT_REACHED' };
  }
  if (
    coupon.maxRedemptionsPerCustomer !== undefined &&
    input.customerRedemptions >= coupon.maxRedemptionsPerCustomer
  ) {
    return { valid: false, reason: 'PER_CUSTOMER_LIMIT_REACHED' };
  }

  const now = new Date(input.nowIso).getTime();
  if (coupon.validFromIso && now < new Date(coupon.validFromIso).getTime()) {
    return { valid: false, reason: 'NOT_STARTED' };
  }
  if (coupon.validUntilIso && now > new Date(coupon.validUntilIso).getTime()) {
    return { valid: false, reason: 'EXPIRED' };
  }

  if (coupon.minOrderCents !== undefined && orderItemsCents < coupon.minOrderCents) {
    return { valid: false, reason: 'MIN_ORDER_NOT_REACHED' };
  }

  if (coupon.firstOrderOnly && !input.isFirstOrder) {
    return { valid: false, reason: 'FIRST_ORDER_ONLY' };
  }

  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const eligible = input.orderCategoryCode !== undefined &&
      coupon.applicableCategories.includes(input.orderCategoryCode);
    if (!eligible) {
      return { valid: false, reason: 'CATEGORY_NOT_ELIGIBLE' };
    }
  }

  switch (coupon.type) {
    case 'PERCENTAGE': {
      const pct = coupon.percentOff;
      if (pct === undefined || pct <= 0 || pct > 100) {
        throw new DomainError(`percentOff inválido para cupom ${coupon.code}: ${pct}`);
      }
      let discount = Math.floor((orderItemsCents * pct) / 100);
      if (coupon.maxDiscountCents !== undefined) {
        discount = Math.min(discount, coupon.maxDiscountCents);
      }
      discount = Math.min(discount, orderItemsCents);
      return { valid: true, discountCents: discount, freeDelivery: false };
    }
    case 'FIXED': {
      const amount = coupon.amountOffCents ?? 0;
      if (amount <= 0) {
        throw new DomainError(`amountOffCents inválido para cupom ${coupon.code}`);
      }
      const discount = Math.min(amount, orderItemsCents);
      return { valid: true, discountCents: discount, freeDelivery: false };
    }
    case 'FREE_DELIVERY': {
      // Frete grátis não sofre teto de desconto (é a promessa do cupom).
      return { valid: true, discountCents: deliveryFeeCents, freeDelivery: true };
    }
  }
}
