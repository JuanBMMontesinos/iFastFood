import React from 'react';
import Link from 'next/link';
import {
  Utensils,
  MapPin,
  Clock,
  ShieldCheck,
  TrendingUp,
  Bike,
  Sparkles,
  CheckCircle,
  Smartphone,
  Star,
  ChevronRight,
  ArrowRight,
  Receipt,
  Headphones,
} from 'lucide-react';
import { LeadCaptureForm } from '../components/LeadCaptureForm';

export default function HomePage() {
  return (
    <div className="space-y-24 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-surface via-white to-white pt-12 pb-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-brand-primary text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>O ecossistema de delivery mais inteligente do Brasil</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
                Sua comida favorita, <br />
                <span className="text-brand-primary">entregue no tempo certo.</span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                Conectamos restaurantes autênticos, entregadores valorizados e você em uma experiência com rastreamento GPS em tempo real e entrega segura por código PIN.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="#cliente"
                  className="px-6 py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/25 flex items-center space-x-2 transition"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Baixar Aplicativo</span>
                </Link>
                <Link
                  href="#restaurantes"
                  className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-sm shadow-sm flex items-center space-x-2 transition"
                >
                  <span>Cadastrar Restaurante</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Indicadores de Confiança */}
              <div className="pt-8 grid grid-cols-3 gap-6 border-t border-slate-200/60 max-w-lg">
                <div>
                  <div className="text-2xl font-black text-slate-900">99.4%</div>
                  <div className="text-xs text-slate-500 font-medium">Entregas no Prazo</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">4.9 ★</div>
                  <div className="text-xs text-slate-500 font-medium">Avaliação dos Clientes</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Gorjeta ao Entregador</div>
                </div>
              </div>
            </div>

            {/* Mockup Visual Interativo */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200/80">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">iFastFood Live Tracking</span>
                </div>

                <div className="mt-4 bg-slate-900 text-white rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-brand-primary font-bold uppercase tracking-wider">A caminho</span>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono">PIN: 7492</span>
                  </div>
                  <h4 className="font-bold text-base">Hambúrguer Artesanal Smash Duplo</h4>
                  <p className="text-xs text-slate-400 mt-1">Restaurante: Burger King da Esquina</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-3">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chega em ~14 min</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pago via Stripe</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">Entregador parceiro:</span>
                    <span className="text-xs font-bold text-slate-900">Carlos M. (Honda CB 300)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">Distância restante:</span>
                    <span className="text-xs font-bold text-slate-900">1.8 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO PARA CLIENTES */}
      <section id="cliente" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2">Experiência Gastronômica</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tudo o que você ama, do seu jeito.
          </h3>
          <p className="text-slate-600 mt-3 text-base">
            Descubra os melhores estabelecimentos da sua região com cardápios completos, fotos reais, cupons promocionais e pagamento seguro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-red-50 text-brand-primary rounded-xl flex items-center justify-center mb-6">
              <MapPin className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Rastreamento GPS Vivo</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Acompanhe seu entregador metro a metro desde a saída do restaurante até o portão da sua residência.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Entrega com Código PIN</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sua entrega só é finalizada após você fornecer o código PIN de 4 dígitos gerado com exclusividade no seu aplicativo.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Cupons & Ofertas Claras</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Regras justas com descontos percentuais, fixos ou frete grátis, sem pegadinhas nem taxas ocultas no carrinho.
            </p>
          </div>
        </div>
      </section>

      {/* SEÇÃO PARA RESTAURANTES COM LEAD CAPTURE */}
      <section id="restaurantes" className="bg-slate-900 text-white py-20 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full text-emerald-400 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Mais lucro para o seu negócio</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Venda mais com taxas justas e repasse pontual.
              </h2>

              <p className="text-slate-300 text-base leading-relaxed">
                Diga adeus às comissões abusivas de 27% a 30%. No iFastFood, oferecemos contratos com modelo de marketplace ou entrega própria, conciliação contábil por partidas dobradas e suporte humanizado.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-3 text-sm text-slate-200">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Comissão competitiva a partir de 12% no plano entrega própria</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-200">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Repasse bancário direto na sua conta semanalmente sem enrolação</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-200">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Gestor de pedidos com alertas sonoros e impressão automática de comandas</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <LeadCaptureForm
                type="MERCHANT"
                title="Cadastre seu Restaurante"
                subtitle="Preencha os dados abaixo e entraremos em contato para liberar seu cardápio."
              />
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO PARA ENTREGADORES COM LEAD CAPTURE */}
      <section id="entregadores" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <LeadCaptureForm
              type="COURIER"
              title="Seja um Entregador Parceiro"
              subtitle="Pilote com liberdade, garanta ganhos transparentes e receba por quilômetro rodado."
            />
          </div>

          <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-brand-primary text-xs font-semibold">
              <Bike className="w-3.5 h-3.5" />
              <span>Respeito a quem move a cidade</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Faça suas próprias horas e receba com clareza.
            </h2>

            <p className="text-slate-600 text-base leading-relaxed">
              O algoritmo de despacho do iFastFood considera distância real, tempo de preparo e histórico para enviar ofertas vantajosas, sem penalidades arbitrárias.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">100% da Gorjeta é Sua</h4>
                  <p className="text-xs text-slate-500">Cada centavo que o cliente adiciona como gorjeta vai direto para o seu bolso.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Proteção em Cancelamentos</h4>
                  <p className="text-xs text-slate-500">Se o restaurante ou cliente cancelar após você ter se deslocado, você recebe a taxa de deslocamento.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Suporte Prioritário em Rota</h4>
                  <p className="text-xs text-slate-500">Canal direto de suporte no app para imprevistos de trânsito ou contato com cliente.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
