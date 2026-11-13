'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  Bike,
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'ledger' | 'payouts'>('overview');

  // Dados ilustrativos baseados nos modelos de F0 a F5
  const metrics = [
    { title: 'GMV (Volume Bruto)', value: 'R$ 184.950,00', change: '+14,2%', icon: DollarSign },
    { title: 'Receita Líquida (Take Rate)', value: 'R$ 29.592,00', change: '16,0% ef.', icon: TrendingUp },
    { title: 'Pedidos Entregues', value: '3.420', change: '+8,5%', icon: ShoppingBag },
    { title: 'Entregadores Ativos', value: '142', change: 'Online agora', icon: Users },
  ];

  const kycList = [
    { id: 'm1', name: 'Pizzaria Bella Napoli', type: 'MERCHANT', document: '12.345.678/0001-90', submittedAt: '13/11 09:30', status: 'PENDING_REVIEW' },
    { id: 'm2', name: 'Burger Artesanal Prime', type: 'MERCHANT', document: '98.765.432/0001-11', submittedAt: '13/11 10:15', status: 'PENDING_REVIEW' },
    { id: 'c1', name: 'Carlos Eduardo Silva', type: 'COURIER', document: '123.456.789-00 (CNH A/B)', submittedAt: '13/11 11:00', status: 'PENDING_REVIEW' },
  ];

  const ledgerRecords = [
    { id: 'led-1', time: '13/11 11:35', account: '1001 Gateway Stripe (Ativo)', side: 'DEBIT', amount: 'R$ 78,90', ref: 'Pedido IF-9812A' },
    { id: 'led-2', time: '13/11 11:35', account: '2001 Repasse Lojista (Passivo)', side: 'CREDIT', amount: 'R$ 64,50', ref: 'Pedido IF-9812A' },
    { id: 'led-3', time: '13/11 11:35', account: '4001 Receita Comissão (Receita)', side: 'CREDIT', amount: 'R$ 9,47', ref: 'Pedido IF-9812A' },
    { id: 'led-4', time: '13/11 11:35', account: '4002 Taxa de Serviço (Receita)', side: 'CREDIT', amount: 'R$ 1,99', ref: 'Pedido IF-9812A' },
    { id: 'led-5', time: '13/11 11:35', account: '2002 Repasse Entregador (Passivo)', side: 'CREDIT', amount: 'R$ 2,94', ref: 'Pedido IF-9812A' },
  ];

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
              {tab === 'kyc' && 'Fila de KYC (3)'}
              {tab === 'ledger' && 'Ledger (Partidas Dobradas)'}
              {tab === 'payouts' && 'Repasses (Payouts)'}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{m.title}</span>
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EA1D2C] flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-gray-900">{m.value}</span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{m.change}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={20} />
                Status do Sistema & Infraestrutura
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Supabase PostgreSQL 16 (Pooler)</p>
                    <p className="text-xs text-gray-500">53 tabelas ativas • 0 migrações pendentes</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">CONECTADO</span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Gateway de Pagamentos Stripe</p>
                    <p className="text-xs text-gray-500">Cartões de Crédito + PIX Integrados • Webhooks Ativos</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ATIVO</span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-semibold text-gray-800">Motor de Despacho & Geolocalização</p>
                    <p className="text-xs text-gray-500">Haversine + Algoritmo de Scoring veicular • Foreground Service</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">OPERACIONAL</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('kyc')}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#EA1D2C] hover:bg-red-50/30 transition-all font-semibold text-sm flex items-center justify-between"
                >
                  <span>Revisar Fila de KYC</span>
                  <span className="bg-red-100 text-[#EA1D2C] text-xs px-2 py-0.5 rounded-full font-bold">3</span>
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

        {/* Tab 2: KYC */}
        {activeTab === 'kyc' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Fila de Homologação KYC</h2>
                <p className="text-xs text-gray-500">Validação de documentação fiscal de lojistas e CNH/CRLV de entregadores</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                3 pendentes
              </span>
            </div>

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
                      <p className="text-xs text-gray-500 mt-1">Doc: {item.document} • Enviado em: {item.submittedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <CheckCircle size={14} />
                      Aprovar
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <XCircle size={14} />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Ledger */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ledger em Partidas Dobradas</h2>
                <p className="text-xs text-gray-500">Livro-razão contábil imutável (Total Débitos = Total Créditos)</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle size={14} />
                Partidas Equilibradas (100%)
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Conta Contábil</th>
                  <th className="px-6 py-4">Lado</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{r.time}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{r.account}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        r.side === 'DEBIT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {r.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{r.amount}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{r.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Payouts */}
        {activeTab === 'payouts' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Liquidação Periódica de Parceiros (Payouts)</h2>
            <p className="text-xs text-gray-500 mb-6">
              Executa o fechamento do período descontando comissão em basis points (`bps`), taxa do gateway Stripe e mensalidade acima do teto isento de R$ 1.800/mês.
            </p>

            <div className="max-w-xl space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">ID do Parceiro</label>
                <input
                  type="text"
                  placeholder="UUID do restaurante parceiro"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Início do Período</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fim do Período</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]"
                  />
                </div>
              </div>

              <button className="w-full mt-4 px-6 py-3 bg-[#EA1D2C] hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md transition-all">
                Calcular e Gerar Payout (Partidas Dobradas)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
