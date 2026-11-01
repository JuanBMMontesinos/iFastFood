import { describe, expect, it } from 'vitest';
import { haversineKm } from './haversine';

describe('haversineKm', () => {
  it('distância nula entre pontos idênticos', () => {
    const sp = { lat: -23.5505, lng: -46.6333 };
    expect(haversineKm(sp, sp)).toBe(0);
  });

  it('pequeno deslocamento em SP ≈ 0,51 km (mesma latitude)', () => {
    const a = { lat: -23.5505, lng: -46.6333 };
    const b = { lat: -23.5505, lng: -46.6383 };
    const dist = haversineKm(a, b);
    expect(dist).toBeGreaterThan(0.48);
    expect(dist).toBeLessThan(0.54);
  });

  it('1 grau de latitude ≈ 111,2 km', () => {
    const dist = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(dist).toBeGreaterThan(111.0);
    expect(dist).toBeLessThan(111.4);
  });

  it('distâncias grandes (São Paulo → Rio de Janeiro ≈ 357 km)', () => {
    const dist = haversineKm(
      { lat: -23.5505, lng: -46.6333 }, // SP
      { lat: -22.9068, lng: -43.1729 }, // RJ
    );
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(380);
  });

  it('é simétrica', () => {
    const a = { lat: -23.55, lng: -46.63 };
    const b = { lat: -22.9, lng: -43.17 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
