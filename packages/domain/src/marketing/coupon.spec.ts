import { describe, expect, it } from 'vitest';
import { evaluateCoupon, type CouponShape } from './coupon';
import { DomainError } from '../domain-error';

interface CouponCaseOverride {
  orderItemsCents?: number;
  deliveryFeeCents?: number;
  isFirstOrder?: boolean;
  totalRedemptions?: number;
  customerRedemptions?: number;
  nowIso?: string;
  orderCategoryCode?: string;
}

function couponCase(coupon: CouponShape, overrides: CouponCaseOverride = {}) {
  return {
    coupon,
    orderItemsCents: overrides.orderItemsCents ?? 5000,
    deliveryFeeCents: overrides.deliveryFeeCents ?? 1000,
    isFirstOrder: overrides.isFirstOrder ?? true,
    totalRedemptions: overrides.totalRedemptions ?? 0,
    customerRedemptions: overrides.customerRedemptions ?? 0,
    nowIso: overrides.nowIso ?? new Date('2026-03-15T12:00:00Z').toISOString(),
    orderCategoryCode: overrides.orderCategoryCode,
  };
}

describe('cupom PERCENTAGE', () => {
  const coupon: CouponShape = {
    code: 'DEZ10',
    type: 'PERCENTAGE',
    percentOff: 10,
    minOrderCents: 2000,
  };

  it('10% de R$ 50,00 → R$ 5,00 (sem teto configurado)', () => {
    const result = evaluateCoupon(couponCase(coupon, { orderItemsCents: 5000 }));
    expect(result).toEqual({ valid: true, discountCents: 500, freeDelivery: false });
  });

  it('teto máximo: 10% de R$ 80,00 → limitado a R$ 3,00', () => {
    const capped = { ...coupon, maxDiscountCents: 300 };
    const result = evaluateCoupon(couponCase(capped, { orderItemsCents: 8000 }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountCents).toBe(300);
    }
  });

  it('desconto nunca maior que o próprio pedido', () => {
    const huge: CouponShape = { code: 'CINQUENTA', type: 'PERCENTAGE', percentOff: 100 };
    const result = evaluateCoupon(couponCase(huge, { orderItemsCents: 800 }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountCents).toBe(800);
    }
  });

  it('percentOff > 100 é configuração inválida (erro do sistema, não do cupom)', () => {
    const invalid: CouponShape = { code: 'X', type: 'PERCENTAGE', percentOff: 150 };
    expect(() => evaluateCoupon(couponCase(invalid))).toThrow(DomainError);
  });
});

describe('cupom FIXED', () => {
  it('R$ 7,00 de desconto', () => {
    const coupon: CouponShape = { code: 'MENOS7', type: 'FIXED', amountOffCents: 700 };
    const result = evaluateCoupon(couponCase(coupon, { orderItemsCents: 3000 }));
    expect(result).toEqual({ valid: true, discountCents: 700, freeDelivery: false });
  });

  it('desconto maior que o pedido é limitado ao valor do pedido', () => {
    const coupon: CouponShape = { code: 'MENOS7', type: 'FIXED', amountOffCents: 700 };
    const result = evaluateCoupon(couponCase(coupon, { orderItemsCents: 500 }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountCents).toBe(500);
    }
  });

  it('FIXED sem amountOffCents é configuração inválida', () => {
    const coupon: CouponShape = { code: 'QUEBRADO', type: 'FIXED' };
    expect(() => evaluateCoupon(couponCase(coupon))).toThrow(DomainError);
  });
});

describe('cupom FREE_DELIVERY', () => {
  const coupon: CouponShape = { code: 'FRETEOK', type: 'FREE_DELIVERY' };

  it('desconto é o valor da entrega e marca freeDelivery', () => {
    const result = evaluateCoupon(couponCase(coupon, { deliveryFeeCents: 900 }));
    expect(result).toEqual({ valid: true, discountCents: 900, freeDelivery: true });
  });

  it('entrega grátis não sofre teto de desconto', () => {
    const capped = { ...coupon, maxDiscountCents: 100 };
    const result = evaluateCoupon(couponCase(capped, { deliveryFeeCents: 900 }));
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountCents).toBe(900);
    }
  });
});

describe('restrições dos cupons', () => {
  it('pedido mínimo não atingido', () => {
    const coupon: CouponShape = { code: 'MIN50', type: 'FIXED', amountOffCents: 500, minOrderCents: 5000 };
    expect(evaluateCoupon(couponCase(coupon, { orderItemsCents: 4999 }))).toEqual({
      valid: false,
      reason: 'MIN_ORDER_NOT_REACHED',
    });
    expect(evaluateCoupon(couponCase(coupon, { orderItemsCents: 5000 })).valid).toBe(true);
  });

  it('cupom ainda não começou', () => {
    const coupon: CouponShape = {
      code: 'FUTURO',
      type: 'FIXED',
      amountOffCents: 500,
      validFromIso: '2026-03-20T00:00:00Z',
    };
    const result = evaluateCoupon(couponCase(coupon, { nowIso: '2026-03-15T12:00:00Z' }));
    expect(result).toEqual({ valid: false, reason: 'NOT_STARTED' });
  });

  it('cupom expirado (data final inclusiva)', () => {
    const coupon: CouponShape = {
      code: 'PASSOU',
      type: 'FIXED',
      amountOffCents: 500,
      validUntilIso: '2026-03-15T12:00:00Z',
    };
    // Exatamente no limite: ainda válido.
    expect(evaluateCoupon(couponCase(coupon, { nowIso: '2026-03-15T12:00:00Z' })).valid).toBe(true);
    // Um segundo depois: expirado.
    const result = evaluateCoupon(couponCase(coupon, { nowIso: '2026-03-15T12:00:01Z' }));
    expect(result).toEqual({ valid: false, reason: 'EXPIRED' });
  });

  it('limite global de resgates atingido', () => {
    const coupon: CouponShape = {
      code: 'LIMITADO',
      type: 'FIXED',
      amountOffCents: 500,
      maxRedemptions: 100,
    };
    const result = evaluateCoupon(couponCase(coupon, { totalRedemptions: 100 }));
    expect(result).toEqual({ valid: false, reason: 'USAGE_LIMIT_REACHED' });
  });

  it('limite por cliente atingido', () => {
    const coupon: CouponShape = {
      code: 'UMPORVEZ',
      type: 'FIXED',
      amountOffCents: 500,
      maxRedemptionsPerCustomer: 1,
    };
    const result = evaluateCoupon(couponCase(coupon, { customerRedemptions: 1 }));
    expect(result).toEqual({ valid: false, reason: 'PER_CUSTOMER_LIMIT_REACHED' });
  });

  it('exclusivo para primeiro pedido', () => {
    const coupon: CouponShape = {
      code: 'PRIMEIRA',
      type: 'FIXED',
      amountOffCents: 500,
      firstOrderOnly: true,
    };
    const result = evaluateCoupon(couponCase(coupon, { isFirstOrder: false }));
    expect(result).toEqual({ valid: false, reason: 'FIRST_ORDER_ONLY' });
  });

  it('categoria não elegível', () => {
    const coupon: CouponShape = {
      code: 'MERCADOONLY',
      type: 'FIXED',
      amountOffCents: 500,
      applicableCategories: ['MARKET'],
    };
    const result = evaluateCoupon(
      couponCase(coupon, { orderCategoryCode: 'RESTAURANT' }),
    );
    expect(result).toEqual({ valid: false, reason: 'CATEGORY_NOT_ELIGIBLE' });

    const okResult = evaluateCoupon(couponCase(coupon, { orderCategoryCode: 'MARKET' }));
    expect(okResult.valid).toBe(true);
  });

  it('categoria ausente no pedido com restrição ativa → não elegível', () => {
    const coupon: CouponShape = {
      code: 'MERCADOONLY',
      type: 'FIXED',
      amountOffCents: 500,
      applicableCategories: ['MARKET'],
    };
    const result = evaluateCoupon(couponCase(coupon, { orderCategoryCode: undefined }));
    expect(result).toEqual({ valid: false, reason: 'CATEGORY_NOT_ELIGIBLE' });
  });
});

describe('guardas de entrada', () => {
  it('pedido negativo lança DomainError', () => {
    const coupon: CouponShape = { code: 'X', type: 'FIXED', amountOffCents: 100 };
    expect(() =>
      evaluateCoupon(couponCase(coupon, { orderItemsCents: -10 })),
    ).toThrow(DomainError);
  });
});
