import { describe, expect, it } from 'vitest';
import {
  assertBalancedEntries,
  buildOrderPaymentLedgerEntries,
  buildPayoutLedgerEntries,
  ProposedLedgerEntry,
} from './ledger';

describe('Financeiro - Partidas Dobradas (Ledger)', () => {
  it('valida lançamentos equilibrados corretamente', () => {
    const balanced: ProposedLedgerEntry[] = [
      { accountCode: '1001', side: 'DEBIT', amountCents: 5000 },
      { accountCode: '2001', side: 'CREDIT', amountCents: 4000 },
      { accountCode: '4001', side: 'CREDIT', amountCents: 1000 },
    ];

    expect(() => assertBalancedEntries(balanced)).not.toThrow();
  });

  it('rejeita lançamentos desbalanceados', () => {
    const unbalanced: ProposedLedgerEntry[] = [
      { accountCode: '1001', side: 'DEBIT', amountCents: 5000 },
      { accountCode: '2001', side: 'CREDIT', amountCents: 4500 },
    ];

    expect(() => assertBalancedEntries(unbalanced)).toThrow('Partidas dobradas desbalanceadas');
  });

  it('rejeita valor zero ou negativo', () => {
    const invalid: ProposedLedgerEntry[] = [
      { accountCode: '1001', side: 'DEBIT', amountCents: -100 },
      { accountCode: '2001', side: 'CREDIT', amountCents: -100 },
    ];

    expect(() => assertBalancedEntries(invalid)).toThrow('Lançamento com valor inválido');
  });

  it('constrói lançamentos de pedido pago equilibrados', () => {
    // Pedido: R$ 50,00 total = R$ 41,00 repasse lojista + R$ 6,00 comissão + R$ 2,00 taxa servico + R$ 1,00 entregador
    const entries = buildOrderPaymentLedgerEntries({
      orderId: 'ord-123',
      customerTotalCents: 5000,
      merchantNetCents: 4100,
      commissionCents: 600,
      serviceFeeCents: 200,
      feeCourierCents: 100,
    });

    expect(entries).toHaveLength(5);
    expect(() => assertBalancedEntries(entries)).not.toThrow();
  });

  it('constrói lançamentos de repasse equilibrados', () => {
    const entries = buildPayoutLedgerEntries({
      payoutId: 'pay-1',
      merchantId: 'm-1',
      netCents: 35000,
    });

    expect(entries).toHaveLength(2);
    expect(entries[0].side).toBe('DEBIT');
    expect(entries[1].side).toBe('CREDIT');
    expect(entries[0].amountCents).toBe(35000);
    expect(entries[1].amountCents).toBe(35000);
  });
});
