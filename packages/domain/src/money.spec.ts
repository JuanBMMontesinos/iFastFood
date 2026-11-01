import { describe, expect, it } from 'vitest';
import { applyBps, clamp, formatBRL, fromCents, percentToBps, toCents } from './money';

describe('toCents / fromCents', () => {
  it('converte reais para centavos inteiros', () => {
    expect(toCents(50)).toBe(5000);
    expect(toCents(0.99)).toBe(99);
    expect(toCents(1.8)).toBe(180);
  });

  it('arredonda meio centavo para cima (round half-up)', () => {
    expect(toCents(12.345)).toBe(1235);
  });

  it('inverte a conversão', () => {
    expect(fromCents(toCents(7.5))).toBe(7.5);
  });

  it('rejeita valores não finitos', () => {
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('applyBps', () => {
  it('aplica 12% (1200 bps) com arredondamento matemático', () => {
    expect(applyBps(5000, 1200)).toBe(600);
  });

  it('aplica 3,2% (320 bps) sobre 6000 → 192', () => {
    expect(applyBps(6000, 320)).toBe(192);
  });

  it('resultado sub-centavo arredonda para baixo (0,05 → 0)', () => {
    // 100 centavos × 5 bps = 0,05 centavos
    expect(applyBps(100, 5)).toBe(0);
  });
});

describe('percentToBps', () => {
  it('converte porcentagens legíveis', () => {
    expect(percentToBps(12)).toBe(1200);
    expect(percentToBps(23)).toBe(2300);
    expect(percentToBps(3.2)).toBe(320);
  });
});

describe('formatBRL', () => {
  it('formata valores comuns', () => {
    expect(formatBRL(110000)).toBe('R$ 1.100,00');
    expect(formatBRL(99)).toBe('R$ 0,99');
    expect(formatBRL(0)).toBe('R$ 0,00');
    expect(formatBRL(500)).toBe('R$ 5,00');
  });

  it('agrupa milhares', () => {
    expect(formatBRL(1000500)).toBe('R$ 10.005,00');
    expect(formatBRL(123456789)).toBe('R$ 1.234.567,89');
  });

  it('sinaliza negativos', () => {
    expect(formatBRL(-500)).toBe('-R$ 5,00');
  });
});

describe('clamp', () => {
  it('mantém o valor dentro do intervalo', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});
