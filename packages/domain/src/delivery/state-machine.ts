/**
 * State machine da ENTREGA (corrida do entregador).
 *
 *  OFERTADA (rotas disponíveis) → ACEITA → COLETADO → EM_ROTA → ENTREGADO
 *                                                    ↘ DEVOLVIDO_AO_LOJISTA
 *
 * A aceitação acontece pelo app do entregador (lista "Rotas Disponíveis"
 * ou oferta automática do motor de despacho — ver módulo logistics).
 */
import { DomainError } from '../domain-error';

export const DELIVERY_STATUSES = [
  'OFFERED',
  'ACCEPTED',
  'PICKED_UP',
  'IN_ROUTE',
  'DELIVERED',
  'RETURNED_TO_MERCHANT',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_TRANSITIONS: Readonly<Record<DeliveryStatus, readonly DeliveryStatus[]>> = {
  // Oferta expira e volta para o pool — tratado por nova instância de oferta.
  OFFERED: ['ACCEPTED'],
  ACCEPTED: ['PICKED_UP'],
  PICKED_UP: ['IN_ROUTE'],
  IN_ROUTE: ['DELIVERED', 'RETURNED_TO_MERCHANT'],
  DELIVERED: [],
  RETURNED_TO_MERCHANT: [],
};

export function canTransitionDelivery(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function assertDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!canTransitionDelivery(from, to)) {
    throw new DomainError(
      `Transição de status de entrega não permitida: ${from} → ${to}`,
    );
  }
}

export function isDeliveryStatusTerminal(status: DeliveryStatus): boolean {
  return DELIVERY_TRANSITIONS[status].length === 0;
}
