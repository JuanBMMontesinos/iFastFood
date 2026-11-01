/**
 * Frete por zona geográfica do parceiro — inspirado na área de entrega
 * configurável do Portal do Parceiro:
 *   taxa = base + (perKm × km), com piso (minFee) e raio máximo (maxKm).
 *
 * Planos "Entrega" (logística da plataforma) usam o motor de despacho
 * com tabela própria (módulo logistics — fases F4+).
 */
import { MoneyCents } from '../money';

export interface DeliveryFeeZone {
  /** Valor fixo por corrida (ponto de partida da tabela). */
  baseFeeCents: MoneyCents;
  /** Valor por quilômetro rodado. */
  perKmCents: MoneyCents;
  /** Piso da taxa — nunca abaixo disso, mesmo em distâncias curtas. */
  minFeeCents: MoneyCents;
  /** Raio máximo atendido. `undefined` = sempre atende. */
  maxKm?: number;
}

export type DeliveryFeeResult =
  | { ok: true; feeCents: MoneyCents }
  | { ok: false; reason: 'OUT_OF_RANGE' };

/**
 * Calcula a taxa de entrega dentro da zona. Distância exatamente no raio
 * máximo ATENDE (<=). Arredondamento matemático para centavos.
 */
export function calculateDeliveryFee(zone: DeliveryFeeZone, distanceKm: number): DeliveryFeeResult {
  if (distanceKm < 0) {
    throw new RangeError('distanceKm não pode ser negativo');
  }
  if (zone.maxKm !== undefined && distanceKm > zone.maxKm) {
    return { ok: false, reason: 'OUT_OF_RANGE' };
  }
  const raw = zone.baseFeeCents + zone.perKmCents * distanceKm;
  const feeCents = Math.max(zone.minFeeCents, Math.round(raw));
  return { ok: true, feeCents };
}

/**
 * Valida a invariante da zona: base ≥ 0, perKm ≥ 0, minFee ≥ 0 e
 * minFee ≤ base (ou a taxa base nunca se aplica).
 * Usado no cadastro do Portal do Parceiro e no backoffice.
 */
export function assertValidZone(zone: DeliveryFeeZone): void {
  const invalid =
    zone.baseFeeCents < 0 ||
    zone.perKmCents < 0 ||
    zone.minFeeCents < 0 ||
    (zone.maxKm !== undefined && zone.maxKm <= 0);
  if (invalid) {
    throw new RangeError('DeliveryFeeZone inválida: valores negativos ou maxKm ≤ 0');
  }
}
