'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface LeadCaptureFormProps {
  type: 'MERCHANT' | 'COURIER';
  title?: string;
  subtitle?: string;
}

export function LeadCaptureForm({ type, title, subtitle }: LeadCaptureFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      // Tenta enviar via endpoint da API iFastFood
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/cms/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          city,
          type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setFeedback(data.message || 'Cadastro recebido com sucesso! Entraremos em contato.');
        setName('');
        setEmail('');
        setPhone('');
        setCity('');
      } else {
        const errJson = await res.json().catch(() => null);
        setStatus('error');
        setFeedback(errJson?.message || 'Falha ao registrar seu interesse. Tente novamente mais tarde.');
      }
    } catch (err) {
      setStatus('error');
      setFeedback('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-100">
      {title && <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}

      {status === 'error' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{feedback}</span>
        </div>
      )}

      {status === 'success' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <h4 className="text-emerald-900 font-bold text-base">Inscrição Confirmada!</h4>
          <p className="text-emerald-700 text-sm mt-1">{feedback}</p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            Novo Cadastro
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {type === 'MERCHANT' ? 'Nome do Restaurante / Responsável' : 'Seu Nome Completo'} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'MERCHANT' ? 'Ex: Pizzaria Fornalha' : 'Ex: João Carlos da Silva'}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail corporativo / pessoal *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Telefone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade & Estado *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex: São Paulo - SP"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md transition disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{type === 'MERCHANT' ? 'Quero Vender Mais' : 'Quero Ser Entregador'}</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
