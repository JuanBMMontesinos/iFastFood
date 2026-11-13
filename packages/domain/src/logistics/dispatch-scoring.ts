import { MoneyCents } from '../money';
import { DomainError } from '../domain-error';

export type CourierVehicleType = 'MOTORCYCLE' | 'CAR' | 'BICYCLE' | 'VAN';

export interface CandidateCourier {
  courierId: string;
  distanceKm: number;
  ratingAvg: number;
  activeDeliveriesCount: number;
  vehicleType: CourierVehicleType;
}

export interface RankedCourier extends CandidateCourier {
  score: number;
}

export interface CourierFeeParams {
  baseFeeCents?: MoneyCents;
  perKmCents?: MoneyCents;
  minFeeCents?: MoneyCents;
}

/** Valores padrão do repasse do entregador (Plano Entrega) */
export const DEFAULT_COURIER_FEE: Required<CourierFeeParams> = {
  baseFeeCents: 650, // R$ 6,50 piso/ponto de partida
  perKmCents: 150,   // R$ 1,50 por km
  minFeeCents: 650,  // R$ 6,50 mínimo garantido
};

/**
 * Calcula a pontuação de despacho de um entregador.
 * Quanto maior o score, melhor a posição na fila de oferta.
 */
export function calculateCourierScore(candidate: CandidateCourier): number {
  if (candidate.distanceKm < 0) {
    throw new DomainError('distanceKm não pode ser negativo');
  }

  // Componente de avaliação (0 a 100 pontos para rating de 0 a 5.0)
  const ratingScore = Math.max(0, Math.min(candidate.ratingAvg, 5)) * 20;

  // Penalidade de distância: -15 pontos por km até a loja
  const distancePenalty = candidate.distanceKm * 15;

  // Penalidade por carga atual: -30 pontos por entrega simultânea em andamento
  const loadPenalty = candidate.activeDeliveriesCount * 30;

  // Ajuste por tipo de veículo
  let vehicleBonus = 0;
  switch (candidate.vehicleType) {
    case 'MOTORCYCLE':
      vehicleBonus = 10;
      break;
    case 'CAR':
      vehicleBonus = 5;
      break;
    case 'BICYCLE':
      // Bicicleta é viável para raio curto, mas penalizada para distâncias maiores
      vehicleBonus = candidate.distanceKm > 3 ? -30 : 0;
      break;
    case 'VAN':
      vehicleBonus = 0;
      break;
  }

  return Math.round(ratingScore - distancePenalty - loadPenalty + vehicleBonus);
}

/**
 * Filtra e ordena candidatos elegíveis para receber a oferta da corrida.
 * Regras de elegibilidade:
 * - Raio máximo: 10 km (ou 4 km se bicicleta);
 * - Carga máxima: no máximo 2 corridas ativas simultâneas.
 */
export function rankCouriersForOffer(
  candidates: CandidateCourier[],
  maxDistanceKm = 10,
  maxActiveDeliveries = 2,
): RankedCourier[] {
  return candidates
    .filter((c) => {
      if (c.activeDeliveriesCount >= maxActiveDeliveries) return false;
      if (c.vehicleType === 'BICYCLE' && c.distanceKm > 4) return false;
      if (c.distanceKm > maxDistanceKm) return false;
      return true;
    })
    .map((c) => ({
      ...c,
      score: calculateCourierScore(c),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Calcula o repasse ao entregador pela corrida em centavos inteiros.
 */
export function calculateCourierFee(
  distanceKm: number,
  params: CourierFeeParams = {},
): MoneyCents {
  if (distanceKm < 0) {
    throw new DomainError('distanceKm não pode ser negativo');
  }

  const base = params.baseFeeCents ?? DEFAULT_COURIER_FEE.baseFeeCents;
  const perKm = params.perKmCents ?? DEFAULT_COURIER_FEE.perKmCents;
  const min = params.minFeeCents ?? DEFAULT_COURIER_FEE.minFeeCents;

  const rawFee = base + perKm * distanceKm;
  return Math.max(min, Math.round(rawFee));
}

/**
 * Valida o código PIN de confirmação de entrega (4 dígitos).
 */
export function verifyDeliveryPin(providedPin: string, expectedPin: string): boolean {
  if (!providedPin || !expectedPin) return false;
  const cleanProvided = providedPin.replace(/\D/g, '').trim();
  const cleanExpected = expectedPin.replace(/\D/g, '').trim();
  return cleanProvided.length === 4 && cleanProvided === cleanExpected;
}
