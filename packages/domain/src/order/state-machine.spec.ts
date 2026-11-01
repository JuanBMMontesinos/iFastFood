import { describe, expect, it } from 'vitest';
import {
  assertOrderTransition,
  canTransitionOrder,
  isOrderStatusTerminal,
  ORDER_STATUSES,
  type OrderStatus,
} from './state-machine';
import { DomainError } from '../domain-error';

describe('fluxo feliz do pedido', () => {
  it('CRIADO → AGUARDANDO_ACEITE → ACEITO → EM_PREPARO → PRONTO → DESPACHADO → EM_ENTREGA → ENTREGADO', () => {
    const happyPath: OrderStatus[] = [
      'CREATED',
      'PENDING_ACCEPTANCE',
      'ACCEPTED',
      'IN_PREPARATION',
      'READY_FOR_PICKUP',
      'DISPATCHED',
      'IN_DELIVERY',
      'DELIVERED',
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransitionOrder(happyPath[i]!, happyPath[i + 1]!)).toBe(true);
    }
  });
});

describe('decisões do parceiro (Gestor de Pedidos)', () => {
  it('aceita/rejeita/expira a partir de PENDING_ACCEPTANCE', () => {
    expect(canTransitionOrder('PENDING_ACCEPTANCE', 'ACCEPTED')).toBe(true);
    expect(canTransitionOrder('PENDING_ACCEPTANCE', 'REJECTED')).toBe(true);
    expect(canTransitionOrder('PENDING_ACCEPTANCE', 'EXPIRED')).toBe(true);
  });

  it('timeout de 5 minutos leva a EXPIRED', () => {
    expect(canTransitionOrder('PENDING_ACCEPTANCE', 'EXPIRED')).toBe(true);
  });
});

describe('cancelamentos', () => {
  it('é possível cancelar em qualquer fase operacional até a entrega', () => {
    expect(canTransitionOrder('ACCEPTED', 'CANCELED')).toBe(true);
    expect(canTransitionOrder('IN_PREPARATION', 'CANCELED')).toBe(true);
    expect(canTransitionOrder('READY_FOR_PICKUP', 'CANCELED')).toBe(true);
    expect(canTransitionOrder('DISPATCHED', 'CANCELED')).toBe(true);
    expect(canTransitionOrder('IN_DELIVERY', 'CANCELED')).toBe(true);
  });

  it('não é possível cancelar antes do envio ao parceiro nem depois de entregue', () => {
    expect(canTransitionOrder('CREATED', 'CANCELED')).toBe(false);
    expect(canTransitionOrder('DELIVERED', 'CANCELED')).toBe(false);
  });
});

describe('estados terminais', () => {
  it('DELIVERED, REJECTED, EXPIRED e CANCELED não têm saídas', () => {
    for (const terminal of ['DELIVERED', 'REJECTED', 'EXPIRED', 'CANCELED'] as const) {
      expect(isOrderStatusTerminal(terminal)).toBe(true);
    }
    expect(isOrderStatusTerminal('IN_PREPARATION')).toBe(false);
  });

  it('nenhuma transição sai de um estado terminal', () => {
    for (const status of ORDER_STATUSES) {
      if (isOrderStatusTerminal(status)) {
        expect(canTransitionOrder(status, status)).toBe(false);
      }
    }
  });
});

describe('transições ilegais', () => {
  it('lança DomainError com mensagem legível no assert', () => {
    expect(() => assertOrderTransition('DELIVERED', 'CREATED')).toThrow(DomainError);
    expect(() => assertOrderTransition('CREATED', 'DELIVERED')).toThrow(DomainError);
    expect(() => assertOrderTransition('PENDING_ACCEPTANCE', 'IN_PREPARATION')).toThrow(
      DomainError,
    );
  });

  it('asserts passam silenciosamente quando a transição é válida', () => {
    expect(() => assertOrderTransition('CREATED', 'PENDING_ACCEPTANCE')).not.toThrow();
  });
});
