import { describe, expect, it } from 'vitest';
import { assertValidZone, calculateDeliveryFee, type DeliveryFeeZone } from './delivery-fee';

const zone: DeliveryFeeZone = {
  baseFeeCents: 500,
  perKmCents: 120,
  minFeeCents: 700,
  maxKm: 10,
};

describe('calculateDeliveryFee', () => {
  it('base + rateio por km: 2 km → R$ 7,40', () => {
    expect(calculateDeliveryFee(zone, 2)).toEqual({ ok: true, feeCents: 740 });
  });

  it('piso da zona: distância curta nunca abaixo do mínimo (R$ 7,00)', () => {
    expect(calculateDeliveryFee(zone, 0.5)).toEqual({ ok: true, feeCents: 700 });
    expect(calculateDeliveryFee(zone, 0)).toEqual({ ok: true, feeCents: 700 });
  });

  it('distância dentro do raio máximo atende (10 km digitais exatos)', () => {
    const atLimit = calculateDeliveryFee(zone, 10);
    expect(atLimit).toEqual({ ok: true, feeCents: 500 + 120 * 10 });
  });

  it('distância fora do raio é rejeitada', () => {
    expect(calculateDeliveryFee(zone, 10.1)).toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
    expect(calculateDeliveryFee(zone, 15)).toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
  });

  it('zona sem raio máximo sempre atende', () => {
    const open: DeliveryFeeZone = { baseFeeCents: 700, perKmCents: 80, minFeeCents: 700 };
    expect(calculateDeliveryFee(open, 500)).toEqual({
      ok: true,
      feeCents: 700 + 80 * 500,
    });
  });

  it('distância negativa é erro de programação (lança RangeError)', () => {
    expect(() => calculateDeliveryFee(zone, -1)).toThrow(RangeError);
  });
});

describe('assertValidZone', () => {
  it('aceita zona válida', () => {
    expect(() => assertValidZone(zone)).not.toThrow();
  });

  it('rejeita taxa base negativa', () => {
    expect(() =>
      assertValidZone({ baseFeeCents: -1, perKmCents: 100, minFeeCents: 0 }),
    ).toThrow(RangeError);
  });

  it('rejeita raio máximo ≤ 0', () => {
    expect(() =>
      assertValidZone({ baseFeeCents: 100, perKmCents: 100, minFeeCents: 0, maxKm: 0 }),
    ).toThrow(RangeError);
  });
});
