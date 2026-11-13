import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';
import { CmsPageDto } from '@ifastfood/contracts';

interface PageProps {
  params: {
    slug: string;
  };
}

// Conteúdos institucionais padrão de fallback (garantem renderização estática e offline)
const FALLBACK_PAGES: Record<string, CmsPageDto> = {
  'sobre-nos': {
    slug: 'sobre-nos',
    title: 'Sobre o iFastFood',
    published: true,
    updatedAt: '2026-11-01T00:00:00.000Z',
    sections: [
      {
        id: 'sec-hero',
        type: 'hero',
        title: 'Nossa Missão é Redefinir o Delivery no Brasil',
        subtitle: 'Conectando comunidades gastronômicas locais com tecnologia de ponta, sustentabilidade e equidade econômica.',
      },
      {
        id: 'sec-historia',
        type: 'text',
        title: 'Nossa História',
        content: `O iFastFood nasceu da convicção de que o mercado de delivery precisava de uma alternativa mais justa e transparente. Durante anos, restaurantes sofreram com comissões exorbitantes que sufocavam margens, entregadores enfrentaram remunerações opacas sem clareza de rota, e clientes lidaram com cobranças ocultas.\n\nConstruímos uma plataforma orientada por engenharia de precisão: livro-razão de partidas dobradas para garantir conciliação financeira impecável, algoritmo de despacho baseado em proximidade geográfica e pontualidade, e aplicativos nativos fluidos para cada participante do ecossistema.`,
      },
      {
        id: 'sec-pilares',
        type: 'features',
        title: 'Nossos 3 Pilares Fundamentais',
        items: [
          {
            title: 'Equidade para os Parceiros',
            description: 'Taxas comissionárias competitivas que permitem aos donos de restaurantes prosperar e investir em sua operação.',
          },
          {
            title: 'Valorização do Entregador',
            description: 'Cálculo transparente de tarifa base + quilometragem e 100% das gorjetas repassadas integralmente.',
          },
          {
            title: 'Transparência para o Consumidor',
            description: 'Rastreamento com precisão métrica, código PIN de segurança e suporte que realmente resolve problemas.',
          },
        ],
      },
    ],
  },
  'termos-de-uso': {
    slug: 'termos-de-uso',
    title: 'Termos e Condições de Uso da Plataforma',
    published: true,
    updatedAt: '2026-11-01T00:00:00.000Z',
    sections: [
      {
        id: 'sec-hero-termos',
        type: 'hero',
        title: 'Termos e Condições de Uso',
        subtitle: 'Última atualização: Novembro de 2026. Leia atentamente as regras de utilização dos nossos serviços.',
      },
      {
        id: 'sec-termos-content',
        type: 'text',
        title: '1. Aceitação e Escopo dos Serviços',
        content: `Ao utilizar a plataforma iFastFood (via aplicativo móvel ou web), você concorda integralmente com estes Termos de Uso. O iFastFood atua como intermediador tecnológico entre clientes, restaurantes parceiros devidamente credenciados e entregadores autônomos parceiros.\n\n2. Cadastro e Segurança de Conta\nO usuário compromete-se a fornecer informações verídicas, manter seus dados cadastrais atualizados e zelar pelo sigilo de suas credenciais de acesso e códigos OTP recebidos via SMS/WhatsApp.\n\n3. Pagamentos e Cancelamentos\nOs pagamentos são processados com segurança por meio do gateway Stripe. Cancelamentos solicitados antes do início do preparo pelo restaurante são reembolsados integralmente. Caso o cancelamento ocorra após o despacho, tarifas de compensação aos parceiros podem ser aplicadas.\n\n4. Código de Confirmação PIN\nPara a segurança de ambas as partes, a entrega de pedidos pode exigir a validação de um código PIN de 4 dígitos informado pelo cliente diretamente ao entregador no ato do recebimento.`,
      },
    ],
  },
  'politica-de-privacidade': {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade e Proteção de Dados (LGPD)',
    published: true,
    updatedAt: '2026-11-01T00:00:00.000Z',
    sections: [
      {
        id: 'sec-hero-privacidade',
        type: 'hero',
        title: 'Política de Privacidade & LGPD',
        subtitle: 'Compromisso com a transparência, segurança cibernética e respeito absoluto aos seus dados pessoais.',
      },
      {
        id: 'sec-privacidade-content',
        type: 'text',
        title: 'Tratamento de Dados Pessoais em Conformidade com a Lei nº 13.709/2018',
        content: `O iFastFood respeita a privacidade de todos os seus usuários. Coletamos apenas as informações estritamente necessárias para a prestação dos nossos serviços de entrega:\n\n• Dados Cadastrais: Nome, e-mail, telefone e CPF para identificação e emissão fiscal.\n• Geolocalização: Coordenadas em tempo real durante a realização de pedidos e rotas ativas de entrega para viabilizar o cálculo de frete e rastreio ao vivo.\n• Criptografia de Ponta a Ponta: Campos sensíveis como chaves de sessão e identificadores são protegidos criptograficamente através de algoritmos AES-GCM em repouso e TLS 1.3 em trânsito.\n• Seus Direitos (DSAR): Você pode solicitar a qualquer momento a visualização, correção, portabilidade ou exclusão/anonimização dos seus dados pessoais através dos nossos canais de suporte ou no painel de configurações.`,
      },
    ],
  },
};

async function getPageData(slug: string): Promise<CmsPageDto | null> {
  // Tenta buscar da API primeiro
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/cms/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // API indisponível: usa fallback
  }

  // Fallback para páginas conhecidas
  return FALLBACK_PAGES[slug] || null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageData(params.slug);
  if (!page) {
    return { title: 'Página Não Encontrada — iFastFood' };
  }
  return {
    title: `${page.title} — iFastFood`,
    description: `Conheça mais sobre ${page.title} na plataforma iFastFood.`,
  };
}

export default async function CmsDynamicPage({ params }: PageProps) {
  const page = await getPageData(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-brand-primary transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Início</span>
        </Link>
      </div>

      <article className="space-y-12">
        {page.sections.map((section) => {
          switch (section.type) {
            case 'hero':
              return (
                <header key={section.id} className="border-b border-slate-200 pb-8">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {section.title}
                  </h1>
                  {section.subtitle && (
                    <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                      {section.subtitle}
                    </p>
                  )}
                </header>
              );

            case 'text':
              return (
                <section key={section.id} className="prose prose-slate max-w-none">
                  {section.title && (
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">{section.title}</h2>
                  )}
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
                    {section.content}
                  </div>
                </section>
              );

            case 'features':
              return (
                <section key={section.id} className="space-y-6 pt-4">
                  {section.title && (
                    <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {section.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm"
                      >
                        <CheckCircle2 className="w-6 h-6 text-brand-primary mb-3" />
                        <h3 className="font-bold text-slate-900 text-base mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}
      </article>
    </div>
  );
}
