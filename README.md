# iFastFood 🍕🏍️🛒

Plataforma marketplace de delivery (comida, mercado, farmácia, bebidas) similar ao iFood:
app do cliente, app do entregador, portal + gestor de pedidos do parceiro, backoffice
administrativo e landing page institucional com CMS dinâmico.

> Plano completo do projeto: [`docs/plano-ifastfood.md`](docs/plano-ifastfood.md)
> ADRs de arquitetura: [`docs/adr/`](docs/adr)
> Guias de API e Integração: [`docs/api/`](docs/api)
> Checklist de Go-Live: [`docs/go-live-checklist.md`](docs/go-live-checklist.md)

## Estrutura do Monorepo

```
apps/
  api/            API NestJS + Prisma (PostgreSQL 16) + Redis — monólito modular
  web-landing/    Portal institucional Next.js 14 + CMS dinâmico (CmsPage)       [F7]
  admin/          Backoffice executivo Next.js 14 + KYC + Livro-Razão Contábil    [F5]
  android-courier/ App nativo Android do entregador (Kotlin + Jetpack Compose)   [F4]
  android-customer/ App nativo Android do cliente (Kotlin + Jetpack Compose)     [F6]
  android-merchant/ Gestor de pedidos parceiro PDV (Kotlin + Jetpack Compose)    [F6]
  ios-apps/       Clientes nativos iOS 16+ (Swift Package OpenAPI)               [F6]
packages/
  domain/         Regras de negócio puras (MoneyCents, ledger, scoring, cupons) [Cobertura 94.6%]
  contracts/      Schemas Zod + OpenAPI + gerador de SDKs nativos
  ui-tokens/      Design tokens compartilhados (cores, tipografia, espaçamentos)
tests/
  load/           Scripts k6 de simulação de alta carga (checkout e despacho)
```

## Quickstart (Desenvolvimento)

Pré-requisitos: Node ≥ 20, pnpm 12, Docker.

```bash
# 1. Dependências
pnpm install

# 2. Infraestrutura local (Postgres + Redis)
pnpm db:up

# 3. Configuração do ambiente
cp .env.example apps/api/.env

# 4. Schema do banco (Supabase: migrations versionadas; local: db push)
pnpm --filter @ifastfood/api db:generate
pnpm --filter @ifastfood/api db:deploy

# 5. API NestJS (porta 3001)
pnpm --filter @ifastfood/api dev

# 6. Backoffice Executivo (porta 3002)
pnpm --filter @ifastfood/admin dev

# 7. Portal Institucional & CMS (porta 3000)
pnpm --filter @ifastfood/web-landing dev

# 8. Testes unitários do domínio (gate de cobertura ≥ 85%)
pnpm --filter @ifastfood/domain test

# 9. Verificação completa de tipos e testes do monorepo
pnpm test
pnpm typecheck
```

## Roadmap de Execução

| Fase | Entregável | Status |
|---|---|:---:|
| F0 | Monorepo, domínio+testes, contratos, API skeleton, Docker, CI, ADRs | ✅ |
| F1 | Identidade/RBAC/LGPD/auditoria | ✅ |
| F2 | Parceiros (KYC/contratos/planos) + cardápio/catálogo (API + Contratos + Testes) | ✅ |
| F3 | Pedido ponta-a-ponta + pagamentos (Stripe padrão) + Descoberta + Cliente (API + Domínio + Contratos + Testes) | ✅ |
| F4 | Motor de despacho + App Entregador (Android Kotlin/Compose) + Logística + Rastreio (API + Domínio + Contratos + Testes) | ✅ |
| F5 | Financeiro (Ledger partidas dobradas, comissões, repasses) + Backoffice completo Next.js (API + Domínio + Contratos + Testes) — **MVP PRONTO** | ✅ |
| F6 | Apps nativos Cliente/Parceiro (Android/iOS) + Marketing/Cupons + Avaliações + Suporte (API + Domínio + Contratos + Testes) | ✅ |
| F7 | Landing CMS, documentação completa de API, testes de carga k6, checklist de go-live e produção | ✅ |

## Convenções Essenciais (ADR-0001)

- **Dinheiro em centavos inteiros** (`MoneyCents`), taxas em basis points (`bps`) — nunca ponto flutuante.
- **Regras de negócio 100% em `packages/domain`** com cobertura de testes ≥ 85%; apps nativos são *thin clients*.
- **Contabilidade por Partidas Dobradas**: Todo fluxo financeiro é registrado com equilíbrio estrito entre débitos e créditos.
- **Contrato-first**: OpenAPI da API gera SDKs Kotlin/Swift automaticamente.
- **Segurança desde o início**: helmet, CORS restrito, validação de entrada via Zod, RBAC, 2FA admin e conformidade total com a LGPD.
