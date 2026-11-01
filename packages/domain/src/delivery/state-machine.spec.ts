import { describe, expect, it } from 'vitest';
import {
  assertDeliveryTransition,
  canTransitionDelivery,
  isDeliveryStatusTerminal,
} from './state-machine';
import { DomainError } from '../domain-error';

describe('state machine da entrega', () => {
  it('fluxo completo: OFERTADA → ACEITA → COLETADO → EM_ROTA → ENTREGADO', () => {
    expect(canTransitionDelivery('OFFERED', 'ACCEPTED')).toBe(true);
    expect(canTransitionDelivery('ACCEPTED', 'PICKED_UP')).toBe(true);
    expect(canTransitionDelivery('PICKED_UP', 'IN_ROUTE')).toBe(true);
    expect(canTransitionDelivery('IN_ROUTE', 'DELIVERED')).toBe(true);
  });

  it('devolução ao lojista só durante EM_ROTA', () => {
    expect(canTransitionDelivery('IN_ROUTE', 'RETURNED_TO_MERCHANT')).toBe(true);
    expect(canTransitionDelivery('PICKED_UP', 'RETURNED_TO_MERCHANT')).toBe(false);
    expect(canTransitionDelivery('ACCEPTED', 'RETURNED_TO_MERCHANT')).toBe(false);
  });

  it('entregador não pode pular etapas (não coletou → não está em rota)', () => {
    expect(canTransitionDelivery('ACCEPTED', 'IN_ROUTE')).toBe(false);
    expect(canTransitionDelivery('OFFERED', 'PICKED_UP')).toBe(false);
  });

  it('entregas finais são terminais', () => {
    expect(isDeliveryStatusTerminal('DELIVERED')).toBe(true);
    expect(isDeliveryStatusTerminal('RETURNED_TO_MERCHANT')).toBe(true);
    expect(isDeliveryStatusTerminal('IN_ROUTE')).toBe(false);
  });

  it('assert lança DomainError em transições ilegais', () => {
    expect(() => assertDeliveryTransition('OFFERED', 'DELIVERED')).toThrow(DomainError);
    expect(() => assertDeliveryTransition('DELIVERED', 'IN_ROUTE')).toThrow(DomainError);
  });

  it('assert não lança em transições válidas', () => {
    expect(() => assertDeliveryTransition('OFFERED', 'ACCEPTED')).not.toThrow();
  });
});
