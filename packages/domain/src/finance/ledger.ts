import { MoneyCents } from '../money';
import { DomainError } from '../domain-error';

export type LedgerSide = 'DEBIT' | 'CREDIT';

export interface ProposedLedgerEntry {
  accountCode: string;
  side: LedgerSide;
  amountCents: MoneyCents;
  memo?: string;
}

export interface OrderLedgerInput {
  orderId: string;
  customerTotalCents: MoneyCents;
  merchantNetCents: MoneyCents;
  commissionCents: MoneyCents;
  serviceFeeCents: MoneyCents;
  processingFeeCents?: MoneyCents;
  feeCourierCents?: MoneyCents;
}

export interface PayoutLedgerInput {
  payoutId: string;
  merchantId: string;
  netCents: MoneyCents;
}

export interface CourierPayoutLedgerInput {
  courierId: string;
  amountCents: MoneyCents;
}

/** Códigos padronizados do Plano de Contas (Chart of Accounts) */
export const LEDGER_ACCOUNTS = {
  // Ativos (1xxx)
  GATEWAY_CLEARING: '1001',
  BANK_CHECKING: '1002',

  // Passivos / Contas a Pagar (2xxx)
  MERCHANT_PAYABLE: '2001',
  COURIER_PAYABLE: '2002',

  // Receitas (4xxx)
  COMMISSION_REVENUE: '4001',
  SERVICE_FEE_REVENUE: '4002',
  MONTHLY_FEE_REVENUE: '4003',

  // Despesas (5xxx)
  GATEWAY_PROCESSING_EXPENSE: '5001',
} as const;

/**
 * Valida a invariante contábil de partidas dobradas:
 * A soma de todos os DÉBITOS deve ser exatamente igual à soma de todos os CRÉDITOS.
 * Nenhum lançamento pode ter valor negativo ou zero.
 */
export function assertBalancedEntries(entries: ProposedLedgerEntry[]): void {
  if (entries.length < 2) {
    throw new DomainError('Uma transação contábil exige no mínimo 2 lançamentos (partidas dobradas).');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (!Number.isInteger(entry.amountCents) || entry.amountCents <= 0) {
      throw new DomainError(`Lançamento com valor inválido: ${entry.amountCents} centavos.`);
    }

    if (entry.side === 'DEBIT') {
      totalDebit += entry.amountCents;
    } else if (entry.side === 'CREDIT') {
      totalCredit += entry.amountCents;
    } else {
      throw new DomainError(`Lado contábil inválido: ${entry.side}`);
    }
  }

  if (totalDebit !== totalCredit) {
    throw new DomainError(
      `Partidas dobradas desbalanceadas: Total Débito (${totalDebit}) ≠ Total Crédito (${totalCredit})`,
    );
  }
}

/**
 * Constrói os lançamentos contábeis de um pedido pago via plataforma:
 *  D: 1001 GATEWAY_CLEARING (total pago pelo cliente)
 *  C: 2001 MERCHANT_PAYABLE (líquido devido ao lojista)
 *  C: 4001 COMMISSION_REVENUE (comissão retida)
 *  C: 4002 SERVICE_FEE_REVENUE (taxa de serviço)
 *  C: 2002 COURIER_PAYABLE (se houver repasse de entregador da plataforma)
 */
export function buildOrderPaymentLedgerEntries(input: OrderLedgerInput): ProposedLedgerEntry[] {
  const entries: ProposedLedgerEntry[] = [
    {
      accountCode: LEDGER_ACCOUNTS.GATEWAY_CLEARING,
      side: 'DEBIT',
      amountCents: input.customerTotalCents,
      memo: `Recebimento pedido ${input.orderId}`,
    },
    {
      accountCode: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
      side: 'CREDIT',
      amountCents: input.merchantNetCents,
      memo: `Repasse lojista pedido ${input.orderId}`,
    },
    {
      accountCode: LEDGER_ACCOUNTS.COMMISSION_REVENUE,
      side: 'CREDIT',
      amountCents: input.commissionCents,
      memo: `Comissão pedido ${input.orderId}`,
    },
    {
      accountCode: LEDGER_ACCOUNTS.SERVICE_FEE_REVENUE,
      side: 'CREDIT',
      amountCents: input.serviceFeeCents,
      memo: `Taxa de serviço pedido ${input.orderId}`,
    },
  ];

  if (input.processingFeeCents && input.processingFeeCents > 0) {
    entries.push({
      accountCode: LEDGER_ACCOUNTS.SERVICE_FEE_REVENUE,
      side: 'CREDIT',
      amountCents: input.processingFeeCents,
      memo: `Taxa de processamento pedido ${input.orderId}`,
    });
  }

  if (input.feeCourierCents && input.feeCourierCents > 0) {
    entries.push({
      accountCode: LEDGER_ACCOUNTS.COURIER_PAYABLE,
      side: 'CREDIT',
      amountCents: input.feeCourierCents,
      memo: `Repasse entregador pedido ${input.orderId}`,
    });
  }

  assertBalancedEntries(entries);
  return entries;
}

/**
 * Constrói os lançamentos do repasse bancário ao lojista:
 *  D: 2001 MERCHANT_PAYABLE
 *  C: 1002 BANK_CHECKING
 */
export function buildPayoutLedgerEntries(input: PayoutLedgerInput): ProposedLedgerEntry[] {
  const entries: ProposedLedgerEntry[] = [
    {
      accountCode: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
      side: 'DEBIT',
      amountCents: input.netCents,
      memo: `Liquidação de repasse ${input.payoutId} para lojista ${input.merchantId}`,
    },
    {
      accountCode: LEDGER_ACCOUNTS.BANK_CHECKING,
      side: 'CREDIT',
      amountCents: input.netCents,
      memo: `Transferência bancária repasse ${input.payoutId}`,
    },
  ];

  assertBalancedEntries(entries);
  return entries;
}
