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

async function getPageData(slug: string): Promise<CmsPageDto | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/cms/pages/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Em caso de falha de conexão, retorna null para acionar notFound()
  }

  return null;
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
