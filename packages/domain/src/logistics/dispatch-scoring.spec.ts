import { describe, expect, it } from 'vitest';
import {
  calculateCourierScore,
  rankCouriersForOffer,
  calculateCourierFee,
  verifyDeliveryPin,
  CandidateCourier,
} from './dispatch-scoring';

describe('Logística - Dispatch Scoring e Repasse', () => {
  it('calcula pontuação com base em distância, avaliação e veículo', () => {
    const motoCourier: CandidateCourier = {
      courierId: 'c1',
      distanceKm: 2,
      ratingAvg: 4.8,
      activeDeliveriesCount: 0,
      vehicleType: 'MOTORCYCLE',
    };

    // rating: 4.8 * 20 = 96
    // distance: 2 * 15 = 30
    // load: 0
    // bonus: 10
    // score = 96 - 30 + 10 = 76
    const score = calculateCourierScore(motoCourier);
    expect(score).toBe(76);
  });

  it('penaliza entregador com entregas ativas e bicicleta em distância longa', () => {
    const busyBike: CandidateCourier = {
      courierId: 'c2',
      distanceKm: 3.5,
      ratingAvg: 4.5,
      activeDeliveriesCount: 1,
      vehicleType: 'BICYCLE',
    };

    // rating: 4.5 * 20 = 90
    // distance: 3.5 * 15 = 52.5
    // load: 1 * 30 = 30
    // bonus bike > 3km: -30
    // raw = 90 - 52.5 - 30 - 30 = -22.5 => Math.round = -23 or -22
    const score = calculateCourierScore(busyBike);
    expect(score).toBeLessThan(0);
  });

  it('lança erro se distanceKm for negativo', () => {
    expect(() =>
      calculateCourierScore({
        courierId: 'c-neg',
        distanceKm: -1,
        ratingAvg: 5,
        activeDeliveriesCount: 0,
        vehicleType: 'CAR',
      }),
    ).toThrow('distanceKm não pode ser negativo');
  });

  it('filtra e ordena candidatos por score elegível', () => {
    const candidates: CandidateCourier[] = [
      {
        courierId: 'far-away',
        distanceKm: 15, // Acima de 10km -> descartado
        ratingAvg: 5,
        activeDeliveriesCount: 0,
        vehicleType: 'MOTORCYCLE',
      },
      {
        courierId: 'overloaded',
        distanceKm: 1,
        ratingAvg: 5,
        activeDeliveriesCount: 2, // Carga max atingida -> descartado
        vehicleType: 'MOTORCYCLE',
      },
      {
        courierId: 'far-bike',
        distanceKm: 4.5, // Bicicleta > 4km -> descartado
        ratingAvg: 4.9,
        activeDeliveriesCount: 0,
        vehicleType: 'BICYCLE',
      },
      {
        courierId: 'good-moto',
        distanceKm: 1.5,
        ratingAvg: 4.9,
        activeDeliveriesCount: 0,
        vehicleType: 'MOTORCYCLE',
      },
      {
        courierId: 'ok-car',
        distanceKm: 3,
        ratingAvg: 4.6,
        activeDeliveriesCount: 0,
        vehicleType: 'CAR',
      },
    ];

    const ranked = rankCouriersForOffer(candidates);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].courierId).toBe('good-moto');
    expect(ranked[1].courierId).toBe('ok-car');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  describe('calculateCourierFee', () => {
    it('garante piso mínimo para distâncias muito curtas', () => {
      // 0.5 km: 650 + 150 * 0.5 = 725
      const feeShort = calculateCourierFee(0.5);
      expect(feeShort).toBe(725);

      // 0 km: 650 + 0 = 650 (piso)
      const feeZero = calculateCourierFee(0);
      expect(feeZero).toBe(650);
    });

    it('calcula proporcional com base na distância', () => {
      // 5 km: 650 + 150 * 5 = 650 + 750 = 1400 (R$ 14,00)
      const fee5km = calculateCourierFee(5);
      expect(fee5km).toBe(1400);
    });

    it('rejeita distância negativa', () => {
      expect(() => calculateCourierFee(-2)).toThrow('distanceKm não pode ser negativo');
    });
  });

  describe('verifyDeliveryPin', () => {
    it('valida código PIN de 4 dígitos corretamente', () => {
      expect(verifyDeliveryPin('1234', '1234')).toBe(true);
      expect(verifyDeliveryPin(' 4567 ', '4567')).toBe(true);
      expect(verifyDeliveryPin('1234', '4321')).toBe(false);
      expect(verifyDeliveryPin('123', '123')).toBe(false); // menos de 4 dígitos
      expect(verifyDeliveryPin('', '1234')).toBe(false);
    });
  });
});
