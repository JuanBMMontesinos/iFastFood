import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Utensils, Smartphone, Store, Bike, ShieldCheck, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'iFastFood — Delivery Rápido, Justo e Inteligente',
  description: 'Conectando os melhores restaurantes e entregadores parceiros aos clientes da sua cidade com velocidade, sustentabilidade e transparência.',
  keywords: ['delivery', 'comida', 'ifastfood', 'restaurantes', 'entregador', 'pedidos online'],
  openGraph: {
    title: 'iFastFood — Delivery Rápido, Justo e Inteligente',
    description: 'Peça sua refeição favorita ou impulsione seu restaurante com a plataforma de delivery mais moderna do Brasil.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        {/* Header de Navegação */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 text-brand-primary font-black text-2xl tracking-tight">
              <Utensils className="w-7 h-7" />
              <span>iFastFood</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
              <Link href="/#cliente" className="hover:text-brand-primary transition-colors">
                Para Você
              </Link>
              <Link href="/#restaurantes" className="hover:text-brand-primary transition-colors">
                Restaurantes Parceiros
              </Link>
              <Link href="/#entregadores" className="hover:text-brand-primary transition-colors">
                Entregadores
              </Link>
              <Link href="/p/sobre-nos" className="hover:text-brand-primary transition-colors">
                Sobre Nós
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link
                href="/#restaurantes"
                className="hidden sm:inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cadastrar Restaurante
              </Link>
              <Link
                href="/#cliente"
                className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:bg-brand-primary/90 shadow-sm transition-all"
              >
                Baixar App
              </Link>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1">{children}</main>

        {/* Rodapé Institucional */}
        <footer className="bg-slate-900 text-slate-400 text-sm py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-xl mb-4">
                <Utensils className="w-6 h-6 text-brand-primary" />
                <span>iFastFood</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                A plataforma de delivery que valoriza cada parceiro, entrega no prazo e proporciona a melhor experiência gastronômica na sua porta.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Descubra</h4>
              <ul className="space-y-2">
                <li><Link href="/#cliente" className="hover:text-white transition-colors">App Cliente (Android & iOS)</Link></li>
                <li><Link href="/#restaurantes" className="hover:text-white transition-colors">Portal do Parceiro</Link></li>
                <li><Link href="/#entregadores" className="hover:text-white transition-colors">Seja um Entregador</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Institucional</h4>
              <ul className="space-y-2">
                <li><Link href="/p/sobre-nos" className="hover:text-white transition-colors">Sobre a Empresa</Link></li>
                <li><Link href="/p/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link href="/p/politica-de-privacidade" className="hover:text-white transition-colors">Política de Privacidade (LGPD)</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Segurança & Conformidade</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pagamentos Criptografados via Stripe</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <HeartHandshake className="w-4 h-4 text-emerald-400" />
                  <span>Livro-Razão Contábil de Partidas Dobradas</span>
                </li>
                <li>Suporte 24/7 para clientes e restaurantes</li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} iFastFood Tecnologia Ltda. Todos os direitos reservados. CNPJ 00.000.000/0001-00.
          </div>
        </footer>
      </body>
    </html>
  );
}
