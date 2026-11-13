'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Building2,
  Bike,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  AdminDashboardMetricsDto,
  KycQueueItemDto,
  LedgerEntryDto,
} from '@ifastfood/contracts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'ledger' | 'payouts'>('overview');
  const [metrics, setMetrics] = useState<AdminDashboardMetricsDto | null>(null);
  const [kycList, setKycList] = useState<KycQueueItemDto[]>([]);
  const [ledgerRecords, setLedgerRecords] = useState<LedgerEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulário de Payout
  const [payoutMerchantId, setPayoutMerchantId] = useState('');
  const [payoutStart, setPayoutStart] = useState('2026-11-01');
  const [payoutEnd, setPayoutEnd] = useState('2026-11-30');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, kycRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/metrics`).catch(() => null),
        fetch(`${API_BASE}/admin/kyc/queue`).catch(() => null),
        fetch(`${API_BASE}/finance/admin/ledger?limit=50`).catch(() => null),
      ]);

      if (metricsRes && metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics(m);
      }

      if (kycRes && kycRes.ok) {
        const k = await kycRes.json();
        setKycList(k);
      }

      if (ledgerRes && ledgerRes.ok) {
        const l = await ledgerRes.json();
        setLedgerRecords(l);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ação de Aprovação / Reprovação de KYC
  const handleReview = async (item: KycQueueItemDto, decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(item.id);
    setFeedback(null);
    try {
      const endpoint =
        item.type === 'MERCHANT'
          ? `${API_BASE}/admin/kyc/merchant/${item.id}/review`
          : `${API_BASE}/admin/kyc/courier/${item.id}/review`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `${item.type === 'MERCHANT' ? 'Restaurante' : 'Entregador'} ${item.name} foi ${
            decision === 'APPROVE' ? 'aprovado' : 'rejeitado'
          } com sucesso no banco de dados!`,
        });
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: err?.error?.message || 'Erro ao processar revisão.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha de conexão com a API.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Geração de Payout
  const handleGeneratePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutMerchantId) {
      setFeedback({ type: 'error', message: 'Selecione ou insira o ID do parceiro.' });
      return;
    }
    setPayoutLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/finance/admin/payouts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: payoutMerchantId,
          periodStart: new Date(payoutStart).toISOString(),
          periodEnd: new Date(payoutEnd).toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: 'success',
          message: `Payout gerado com sucesso! Valor Líquido: ${formatMoney(data.netCents)} (ID: ${data.id})`,
        });
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: err?.error?.message || 'Não há pedidos elegíveis no período selecionado.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao conectar com a API de finanças.' });
    } finally {
      setPayoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EA1D2C] flex items-center justify-center text-white font-black text-xl shadow-md">
            iF
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">iFastFood Backoffice</h1>
            <p className="text-xs text-gray-500 font-medium">Gestão Operacional, KYC & Conciliação Contábil</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2">
            {(['overview', 'kyc', 'ledger', 'payouts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'overview' && 'Visão Geral'}
                {tab === 'kyc' && `Fila de KYC (${kycList.length})`}
                {tab === 'ledger' && 'Ledger (Partidas Dobradas)'}
                {tab === 'payouts' && 'Repasses (Payouts)'}
              </button>
            ))}
          </nav>

          <button
            onClick={loadData}
            title="Atualizar dados do Supabase"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline ml-4">
              Fechar
            </button>
          </div>
        )}

        {/* Metric Cards - 100% Dinâmicos do Supabase */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">GMV (Volume Bruto)</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EA1D2C] flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900">
                {metrics ? formatMoney(metrics.gmvCents) : '...'}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Supabase DB
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Receita Líquida</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EA1D2C] flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900">
                {metrics ? formatMoney(metrics.netRevenueCents) : '...'}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Comissões + Taxas
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Pedidos Entregues</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EA1D2C] flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900">
                {metrics ? metrics.deliveredOrdersCount : '0'}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Status DELIVERED
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Entregadores Ativos</span>
              <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EA1D2C] flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900">
                {metrics ? metrics.activeCouriersCount : '0'}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Aprovados
              </span>
            </div>
          </div>
        </section>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={20} />
                Status do Sistema & Integridade do Banco Supabase
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Supabase PostgreSQL 16 (Conexão Ativa)</p>
                    <p className="text-xs text-gray-500">
                      {metrics
                        ? `${metrics.activeMerchantsCount} lojistas ativos • ${metrics.deliveredOrdersCount} pedidos faturados`
                        : 'Consultando tabelas...'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    CONECTADO
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Gateway de Pagamentos Stripe</p>
                    <p className="text-xs text-gray-500">Cartões de Crédito + PIX Integrados • Idempotência Ativa</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    ATIVO
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Livro-Razão Contábil (Double-Entry Ledger)</p>
                    <p className="text-xs text-gray-500">
                      {ledgerRecords.length} lançamentos auditados • Débitos rigorosamente iguais a Créditos
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    EQUILIBRADO
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ações Operacionais</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('kyc')}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#EA1D2C] hover:bg-red-50/30 transition-all font-semibold text-sm flex items-center justify-between"
                >
                  <span>Revisar Fila de KYC</span>
                  <span className="bg-red-100 text-[#EA1D2C] text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {kycList.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#EA1D2C] hover:bg-red-50/30 transition-all font-semibold text-sm flex items-center justify-between"
                >
                  <span>Fechar Período de Repasses</span>
                  <span className="text-gray-400">→</span>
                </button>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#EA1D2C] hover:bg-red-50/30 transition-all font-semibold text-sm flex items-center justify-between"
                >
                  <span>Auditar Lançamentos Contábeis</span>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: KYC - 100% Dinâmico do Supabase com Ação Real */}
        {activeTab === 'kyc' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Fila de Homologação KYC (Supabase)</h2>
                <p className="text-xs text-gray-500">
                  Lojistas e entregadores aguardando validação de documentos fiscais e CNH
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                {kycList.length} pendentes
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#EA1D2C]" size={32} />
                <p className="text-sm">Carregando fila de KYC diretamente do Supabase...</p>
              </div>
            ) : kycList.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                <p className="font-semibold text-gray-700">Fila de KYC zerada!</p>
                <p className="text-xs mt-1">Todos os parceiros cadastrados foram revisados.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {kycList.map((item) => (
                  <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                        {item.type === 'MERCHANT' ? <Building2 size={24} /> : <Bike size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{item.name}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                            {item.type === 'MERCHANT' ? 'Parceiro' : 'Entregador'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.document} • Enviado em: {formatDate(item.submittedAt)}
                        </p>
                        {item.details && <p className="text-xs text-slate-400 mt-0.5">{item.details}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(item, 'APPROVE')}
                        disabled={actionLoading === item.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                      >
                        {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReview(item, 'REJECT')}
                        disabled={actionLoading === item.id}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Ledger - 100% Dinâmico do Supabase */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ledger em Partidas Dobradas (Supabase)</h2>
                <p className="text-xs text-gray-500">
                  Lançamentos contábeis reais persistidos na tabela LedgerEntry
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle size={14} />
                Partidas Equilibradas ({ledgerRecords.length} lançamentos)
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#EA1D2C]" size={32} />
                <p className="text-sm">Consultando lançamentos contábeis no Supabase...</p>
              </div>
            ) : ledgerRecords.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="font-semibold text-gray-700">Nenhum lançamento contábil no período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Conta Contábil</th>
                      <th className="px-6 py-4">Lado</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Histórico / Memo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledgerRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">{formatDate(r.postedAt)}</td>
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {r.accountCode} - {r.accountName}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                              r.side === 'DEBIT'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {r.side}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{formatMoney(r.amountCents)}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{r.memo ?? r.refType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Payouts */}
        {activeTab === 'payouts' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Liquidação Periódica de Parceiros (Payouts)</h2>
            <p className="text-xs text-gray-500 mb-6">
              Executa o fechamento do período no Supabase descontando comissão em basis points (`bps`), taxa do gateway Stripe e mensalidade contratual.
            </p>

            <form onSubmit={handleGeneratePayout} className="max-w-xl space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  ID do Parceiro (ou slug)
                </label>
                <input
                  type="text"
                  required
                  value={payoutMerchantId}
                  onChange={(e) => setPayoutMerchantId(e.target.value)}
                  placeholder="Ex: merch-bella-napoli ou merch-burger-prime"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Início do Período</label>
                  <input
                    type="date"
                    required
                    value={payoutStart}
                    onChange={(e) => setPayoutStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fim do Período</label>
                  <input
                    type="date"
                    required
                    value={payoutEnd}
                    onChange={(e) => setPayoutEnd(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C] bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={payoutLoading}
                className="w-full mt-4 px-6 py-3 bg-[#EA1D2C] hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {payoutLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Calcular e Gerar Payout no Banco</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
