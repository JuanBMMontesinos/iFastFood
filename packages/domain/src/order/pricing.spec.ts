import { describe, it, expect } from 'vitest';
import { calculateOrderPricing, generateOrderCode } from './pricing';
import { DomainError } from '../domain-error';

describe('Order Pricing & Code Domain Rules', () => {
  const contract = {
    plan: 'BASIC' as const,
    commissionBasis: 'ITEMS' as const,
    commissionBps: 1200, // 12%
    onlinePaymentFeeBps: 320, // 3,2%
    monthlyFeeCents: 11000,
    feeFreeThresholdCents: 180000,
  };

  it('deve calcular corretamente subtotal, frete, taxa de serviço e comissões', () => {
    const result = calculateOrderPricing({
      items: [
        {
          productId: 'prod-1',
          productName: 'Burger Simples',
          unitPriceCents: 2500, // 25,00
          quantity: 2, // 50,00
          options: [
            { groupName: 'Bacon extra', optionName: 'Fatias crocantes', priceDeltaCents: 400 }, // +4,00 cada
          ],
        },
        {
          productId: 'prod-2',
          productName: 'Refrigerante',
          unitPriceCents: 800, // 8,00
          quantity: 1,
          options: [],
        },
      ],
      deliveryFeeCents: 600, // 6,00
      serviceFeeCents: 149, // 1,49
      contract,
    });

    // Item 1: (2500 + 400) * 2 = 5800
    // Item 2: 800 * 1 = 800
    // itemsTotal: 6600 (R$ 66,00)
    expect(result.itemsTotalCents).toBe(6600);
    expect(result.deliveryFeeCents).toBe(600);
    expect(result.serviceFeeCents).toBe(149);
    expect(result.discountCents).toBe(0);
    // total: 6600 + 600 + 149 = 7349 (R$ 73,49)
    expect(result.totalCents).toBe(7349);

    // Comissão 12% de 6600 = 792
    expect(result.commissionCents).toBe(792);
    // Taxa de pagamento online 3,2% de 6600 + 600 = 7200 -> 230
    expect(result.processingFeeCents).toBe(230);
  });

  it('deve aplicar desconto de cupom de porcentagem com limite máximo', () => {
    const result = calculateOrderPricing({
      items: [
        {
          productId: 'prod-1',
          productName: 'Pizza Grande',
          unitPriceCents: 5000,
          quantity: 1,
          options: [],
        },
      ],
      deliveryFeeCents: 500,
      serviceFeeCents: 150,
      couponContext: {
        coupon: {
          code: 'PROMO10',
          type: 'PERCENTAGE',
          percentOff: 20, // 20% de 5000 = 1000
          maxDiscountCents: 800, // teto de 8,00
        },
        isFirstOrder: false,
        totalRedemptions: 5,
        customerRedemptions: 0,
        nowIso: new Date().toISOString(),
      },
      contract,
    });

    expect(result.discountCents).toBe(800);
    // Subtotal: 5000 + 500 + 150 = 5650. Menos 800 = 4850
    expect(result.totalCents).toBe(4850);
  });

  it('deve lançar erro se o pedido não tiver itens', () => {
    expect(() =>
      calculateOrderPricing({
        items: [],
        deliveryFeeCents: 500,
        serviceFeeCents: 150,
        contract,
      }),
    ).toThrow(DomainError);
  });

  it('deve gerar código com prefixo IF- e 5 caracteres', () => {
    const code = generateOrderCode(0.12345);
    expect(code).toMatch(/^IF-[2-9A-Z]{5}$/);
  });
});
