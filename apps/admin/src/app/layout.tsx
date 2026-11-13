import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'iFastFood Admin — Backoffice de Operações & Financeiro',
  description: 'Painel administrativo operacional e financeiro do ecossistema iFastFood',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
