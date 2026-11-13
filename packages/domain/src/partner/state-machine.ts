/**
 * State machine do PARCEIRO (loja) — F2.
 *
 *   ONBOARDING → PENDING_REVIEW (envio de KYC)
 *              → ACTIVE (aprovação + contrato assinado)
 *              → ONBOARDING (recusa corrigível)
 *   ACTIVE ⇄ PAUSED (pausa do lojista); ACTIVE/BLOCKED/CLOSED situações
 *   administrativas; CLOSED é terminal (encerramento de contrato).
 *
 * Estados terminais não emitem transições — atualize status SOMENTE via
 * assertMerchantTransition (lança DomainError em movimento ilegal).
 */
import { DomainError } from '../domain-error';

export const MERCHANT_STATUSES = [
  'ONBOARDING',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAUSED',
  'BLOCKED',
  'CLOSED',
] as const;

export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const MERCHANT_TRANSITIONS: Readonly<
  Record<MerchantStatus, readonly MerchantStatus[]>
> = {
  ONBOARDING: ['PENDING_REVIEW', 'CLOSED'],
  // Recusa volta para ONBOARDING (corrigir e reenviar); aprovação ativa a loja.
  PENDING_REVIEW: ['ONBOARDING', 'ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'BLOCKED', 'CLOSED'],
  // Remoção (block) e pausa podem ser revertidas; encerramento sempre possível.
  PAUSED: ['ACTIVE', 'BLOCKED', 'CLOSED'],
  BLOCKED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
};

export function isMerchantStatusTerminal(status: MerchantStatus): boolean {
  return MERCHANT_TRANSITIONS[status].length === 0;
}

export function canTransitionMerchant(from: MerchantStatus, to: MerchantStatus): boolean {
  return MERCHANT_TRANSITIONS[from].includes(to);
}

/** Valida a transição; lança DomainError quando ilegal. */
export function assertMerchantTransition(from: MerchantStatus, to: MerchantStatus): void {
  if (!canTransitionMerchant(from, to)) {
    throw new DomainError(`Transição de status de parceiro não permitida: ${from} → ${to}`);
  }
}

// ---- KYC -------------------------------------------------------------------

/** Tipos de documento obrigatórios para converter ONBOARDING → PENDING_REVIEW. */
export const KYC_REQUIRED_DOC_TYPES = [
  'CNPJ_CARD',
  'SOCIAL_CONTRACT',
  'ID_CARD',
] as const;

export type MerchantKycDocType = (typeof KYC_REQUIRED_DOC_TYPES)[number];

export interface KycDocumentRef {
  type: string;
  status: string; // PENDING | APPROVED | REJECTED | EXPIRED
}

/** ITU: o envio exige TODOS os documentos submetidos (qualquer status). */
export function isKycSubmissionReady(documents: KycDocumentRef[]): boolean {
  const submitted = new Set(documents.map((d) => d.type));
  return KYC_REQUIRED_DOC_TYPES.every((t) => submitted.has(t));
}

/**
 * Gate de APROVAÇÃO: TODOS os documentos obrigatórios devem estar APPROVED.
 * Documento REJECTED/EXPIRED bloqueia mesmo se também existir cópia aprovada
 * (upsert substitui — não coexistem por tipo, mas a checagem é defensiva).
 */
export function assertKycApproved(documents: KycDocumentRef[]): void {
  const blockers: string[] = [];
  for (const type of KYC_REQUIRED_DOC_TYPES) {
    const row = documents.filter((d) => d.type === type);
    if (row.length === 0) {
      blockers.push(`${type}: ausente`);
      continue;
    }
    if (row.some((d) => d.status !== 'APPROVED')) {
      blockers.push(`${type}: status=${row.map((d) => d.status).join(',')}`);
    }
  }
  if (blockers.length > 0) {
    throw new DomainError(`KYC incompleto: ${blockers.join('; ')}`);
  }
}
