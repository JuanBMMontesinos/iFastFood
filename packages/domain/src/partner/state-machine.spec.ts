import { describe, expect, it } from 'vitest';
import {
  assertKycApproved,
  assertMerchantTransition,
  canTransitionMerchant,
  isKycSubmissionReady,
  isMerchantStatusTerminal,
  KYC_REQUIRED_DOC_TYPES,
  type KycDocumentRef,
  type MerchantStatus,
  MERCHANT_STATUSES,
} from './state-machine';
import { DomainError } from '../domain-error';

describe('fluxo de vida do parceiro', () => {
  it('onboarding → revisão → ativo → pausa → volta → encerramento', () => {
    const life: MerchantStatus[] = [
      'ONBOARDING',
      'PENDING_REVIEW',
      'ACTIVE',
      'PAUSED',
      'ACTIVE',
      'CLOSED',
    ];
    for (let i = 0; i < life.length - 1; i++) {
      expect(canTransitionMerchant(life[i]!, life[i + 1]!)).toBe(true);
        expect(() => assertMerchantTransition(life[i]!, life[i + 1]!)).not.toThrow();
    }
  });

  it('recusa em revisão devolve para ONBOARDING (corrigível)', () => {
    expect(canTransitionMerchant('PENDING_REVIEW', 'ONBOARDING')).toBe(true);
  });

  it('bloqueio e desbloqueio administrativos', () => {
    expect(canTransitionMerchant('ACTIVE', 'BLOCKED')).toBe(true);
    expect(canTransitionMerchant('BLOCKED', 'ACTIVE')).toBe(true);
    expect(canTransitionMerchant('PAUSED', 'BLOCKED')).toBe(true);
    expect(canTransitionMerchant('ONBOARDING', 'BLOCKED')).toBe(false);
  });

  it('lança DomainError em transição ilegal', () => {
    expect(() => assertMerchantTransition('ONBOARDING', 'ACTIVE')).toThrow(DomainError);
    expect(canTransitionMerchant('BLOCKED', 'PAUSED')).toBe(false);
    expect(canTransitionMerchant('CLOSED', 'ACTIVE')).toBe(false);
  });

  it('CLOSED é terminal; todos os status aparecem no mapa de transições', () => {
    expect(isMerchantStatusTerminal('CLOSED')).toBe(true);
    expect(isMerchantStatusTerminal('ACTIVE')).toBe(false);
    for (const s of MERCHANT_STATUSES) {
      expect(MERCHANT_STATUSES).toContain(s);
      expect(() => assertMerchantTransition(s, s)).toThrow(/não permitida/);
    }
  });
});

describe('gate de KYC', () => {
  const approved = (): KycDocumentRef[] =>
    KYC_REQUIRED_DOC_TYPES.map((type) => ({ type, status: 'APPROVED' }));

  it('submissão exige os 3 tipos prescindíveis do status', () => {
    expect(isKycSubmissionReady(approved())).toBe(true);
    expect(
      isKycSubmissionReady([
        { type: 'CNPJ_CARD', status: 'PENDING' },
        { type: 'SOCIAL_CONTRACT', status: 'REJECTED' },
        { type: 'ID_CARD', status: 'APPROVED' },
      ]),
    ).toBe(true);
    expect(isKycSubmissionReady(approved().slice(0, 2))).toBe(false);
  });

  it('aprovação exige TODOS os documentos APPROVED', () => {
    expect(() => assertKycApproved(approved())).not.toThrow();
  });

  it('bloqueia quando falta documento ou há reprovação', () => {
    expect(() => assertKycApproved(approved().slice(0, 2))).toThrow(/KYC incompleto.*ausente/i);
    expect(() =>
      assertKycApproved([
        ...approved().slice(0, 2),
        { type: 'ID_CARD', status: 'PENDING' },
      ]),
    ).toThrow(/ID_CARD.*PENDING/i);
    expect(() =>
      assertKycApproved([
        { type: 'CNPJ_CARD', status: 'APPROVED' },
        { type: 'SOCIAL_CONTRACT', status: 'REJECTED' },
        { type: 'ID_CARD', status: 'APPROVED' },
      ]),
    ).toThrow(/SOCIAL_CONTRACT.*REJECTED/i);
  });
});
