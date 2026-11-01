import { describe, expect, it } from 'vitest';
import {
  computeCustomerServiceFee,
  computeMonthlyFee,
  computeOrderFees,
  DEFAULT_CONTRACT_RATES,
  DEFAULT_SERVICE_FEE,
  type MerchantContractRates,
} from './tax-rules';

const basicContract: MerchantContractRates = {
  plan: 'BASIC',
  commissionBps: 1200,
  onlinePaymentFeeBps: 320,
  monthlyFeeCents: 11_000,
  feeFreeThresholdCents: 180_000,
  commissionBasis: 'ITEMS',
};

const deliveryContract: MerchantContractRates = {
  ...basicContract,
  plan: 'DELIVERY',
  commissionBps: 2300,
  monthlyFeeCents: 15_000,
  commissionBasis: 'ITEMS_AND_DELIVERY',
};

describe('computeOrderFees — exemplo oficial do mercado (plano Básico)', () => {
  it('R$ 50 itens: comissão R$ 6,00, repasse líquido R$ 44,00 (sem entrega)', () => {
    const fees = computeOrderFees({
      itemsTotalCents: 5000,
      deliveryFeeCents: 0,
      paymentMode: 'PLATFORM',
      contract: basicContract,
    });
    expect(fees.commissionCents).toBe(600);
    expect(fees.paymentProcessingFeeCents).toBe(160); // 5000 * 3,2%
    expect(fees.merchantNetCents).toBe(4240);
  });

  it('R$ 50 itens + R$ 10 entrega pago via iFood: comissão R$ 6,00, taxa R$ 1,92, líquido R$ 52,08', () => {
    const fees = computeOrderFees({
      itemsTotalCents: 5000,
      deliveryFeeCents: 1000,
      paymentMode: 'PLATFORM',
      contract: basicContract,
    });
    expect(fees.commissionableBaseCents).toBe(5000); // comissão sobre itens
    expect(fees.commissionCents).toBe(600);
    expect(fees.paymentProcessingFeeCents).toBe(192); // 6000 * 3,2%
    expect(fees.merchantNetCents).toBe(5208);
  });

  it('plano Entrega: comissão incide sobre itens + entrega', () => {
    const fees = computeOrderFees({
      itemsTotalCents: 5000,
      deliveryFeeCents: 1000,
      paymentMode: 'PLATFORM',
      contract: deliveryContract,
    });
    expect(fees.commissionableBaseCents).toBe(6000);
    expect(fees.commissionCents).toBe(1380); // 6000 * 23%
    expect(fees.merchantNetCents).toBe(6000 - 1380 - 192);
  });

  it('pago na loja (dinheiro): sem taxa de processamento online', () => {
    const fees = computeOrderFees({
      itemsTotalCents: 5000,
      deliveryFeeCents: 1000,
      paymentMode: 'STORE',
      contract: basicContract,
    });
    expect(fees.paymentProcessingFeeCents).toBe(0);
    expect(fees.merchantNetCents).toBe(6000 - 600);
  });

  it('soma a taxa de serviço do cliente no total pago', () => {
    const fees = computeOrderFees({
      itemsTotalCents: 5000,
      deliveryFeeCents: 1000,
      paymentMode: 'PLATFORM',
      contract: basicContract,
    });
    expect(fees.customerServiceFeeCents).toBe(199);
    expect(fees.customerTotalCents).toBe(5000 + 1000 + 199);
  });

  it('rejeita valores negativos', () => {
    expect(() =>
      computeOrderFees({
        itemsTotalCents: -1,
        deliveryFeeCents: 0,
        paymentMode: 'PLATFORM',
        contract: basicContract,
      }),
    ).toThrow(RangeError);
  });
});

describe('computeCustomerServiceFee', () => {
  it('clampa para o intervalo do mercado (R$ 0,99 – R$ 2,49)', () => {
    expect(computeCustomerServiceFee(DEFAULT_SERVICE_FEE)).toBe(199);
    expect(
      computeCustomerServiceFee({ minCents: 99, maxCents: 249, defaultCents: 50 }),
    ).toBe(99);
    expect(
      computeCustomerServiceFee({ minCents: 99, maxCents: 249, defaultCents: 999 }),
    ).toBe(249);
  });

  it('rejeita configuração com mínimo maior que o máximo', () => {
    expect(() => computeCustomerServiceFee({ minCents: 300, maxCents: 100, defaultCents: 150 }))
      .toThrow(RangeError);
  });
});

describe('computeMonthlyFee — regra "> R$ 1.800,00 no mês"', () => {
  it('não cobra mensalidade abaixo do limite', () => {
    expect(
      computeMonthlyFee({
        monthlyGrossCents: 179_900,
        monthlyFeeCents: 11_000,
        feeFreeThresholdCents: 180_000,
      }),
    ).toBe(0);
  });

  it('não cobra no limite exato (estritamente maior)', () => {
    expect(
      computeMonthlyFee({
        monthlyGrossCents: 180_000,
        monthlyFeeCents: 11_000,
        feeFreeThresholdCents: 180_000,
      }),
    ).toBe(0);
  });

  it('cobra a mensalidade do plano acima do limite', () => {
    expect(
      computeMonthlyFee({
        monthlyGrossCents: 1_800_001,
        monthlyFeeCents: 15_000,
        feeFreeThresholdCents: 180_000,
      }),
    ).toBe(15_000);
  });
});

describe('DEFAULT_CONTRACT_RATES espelham os planos do mercado', () => {
  it('Básico 12% / Entrega 23%, taxa online 3,2%, mensalidades R$ 110 / R$ 150', () => {
    expect(DEFAULT_CONTRACT_RATES.BASIC.commissionBps).toBe(1200);
    expect(DEFAULT_CONTRACT_RATES.DELIVERY.commissionBps).toBe(2300);
    expect(DEFAULT_CONTRACT_RATES.BASIC.onlinePaymentFeeBps).toBe(320);
    expect(DEFAULT_CONTRACT_RATES.DELIVERY.onlinePaymentFeeBps).toBe(320);
    expect(DEFAULT_CONTRACT_RATES.BASIC.monthlyFeeCents).toBe(11_000);
    expect(DEFAULT_CONTRACT_RATES.DELIVERY.monthlyFeeCents).toBe(15_000);
    expect(DEFAULT_CONTRACT_RATES.BASIC.feeFreeThresholdCents).toBe(180_000);
  });
});
