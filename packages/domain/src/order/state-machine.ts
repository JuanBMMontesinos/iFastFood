/**
 * State machine do PEDIDO (motor de ocorrências com trilha de eventos).
 *
 *   CRIADO → AGUARDANDO_ACEITE (confirmado | rejeitado | timeout)
 *          → EM_PREPARO → PRONTO_COLETA → DESPACHADO → EM_ENTREGA → ENTREGADO
 *          | CANCELADO
 *
 * Estados terminais não emitem transições; toda mudança gera OrderEvent
 * na camada de persistência (ver schema Prisma).
 */
import { DomainError } from '../domain-error';

export const ORDER_STATUSES = [
  'CREATED',
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
  'DISPATCHED',
  'IN_DELIVERY',
  'DELIVERED',
  'CANCELED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  CREATED: ['PENDING_ACCEPTANCE'],
  // Janela do Gestor de Pedidos: aceite manual em até 5 min ou aceite automático.
  PENDING_ACCEPTANCE: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  // Após aceite: cancelamento só com estorno (regras de pagamento tratam).
  ACCEPTED: ['IN_PREPARATION', 'CANCELED'],
  IN_PREPARATION: ['READY_FOR_PICKUP', 'CANCELED'],
  READY_FOR_PICKUP: ['DISPATCHED', 'CANCELED'],
  DISPATCHED: ['IN_DELIVERY', 'CANCELED'],
  IN_DELIVERY: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Valida a transição e lança DomainError quando ilegal.
 * Use em todos os endpoints que movem o pedido — nunca atualize o status direto.
 */
export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new DomainError(
      `Transição de status de pedido não permitida: ${from} → ${to}`,
    );
  }
}

export function isOrderStatusTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}
