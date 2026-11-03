# iFastFood 🍕🏍️🛒

Plataforma marketplace de delivery (comida, mercado, farmácia, bebidas) similar ao iFood:
app do cliente, app do entregador, portal + gestor de pedidos do parceiro, backoffice
administrativo e landing page institucional.

> Plano completo do projeto: `C:\Users\jubam\.opencode\plan\ifastfood-plan.md`
> ADRs de arquitetura: [`docs/adr/`](docs/adr)

## Estrutura do monorepo

```
apps/
  api/            API NestJS + Prisma (PostgreSQL 16) + Redis — monólito modular
  web-landing/    Landing page institucional (Next.js)          [F3/F7]
  web-customer/   PWA do cliente (Next.js)                     [F3]
  web-merchant/   Portal do Parceiro + Gestor de Pedidos       [F2/F3]
  admin/          Backoffice (Next.js + shadcn/ui)             [F5]
  android-* / ios-*   Apps nativos Kotlin/Swift (SDKs gerados) [F4/F6]
packages/
  domain/         Regras de negócio puras + testes unitários (gate ≥ 85%)
  contracts/      Schemas Zod + configs de codegen dos SDKs nativos
  ui-tokens/      Design tokens (fonte única web + nativos)
```

## Quickstart (desenvolvimento)

Pré-requisitos: Node ≥ 20, pnpm 12, Docker.

```bash
# 1. Dependências
pnpm install

# 2. Infraestrutura local (Postgres + Redis)
docker compose up -d postgres redis

# 3. Configuração do ambiente
cp .env.example apps/api/.env

# 4. Schema do banco (Supabase: migrations versionadas; local: db push)
pnpm --filter @ifastfood/api db:generate
pnpm --filter @ifastfood/api db:deploy   # aponta DATABASE_URL do apps/api/.env

# 5. API
pnpm --filter @ifastfood/api dev     # http://localhost:3001/health

# 6. Testes unitários do domínio (gate de cobertura 85%)
pnpm --filter @ifastfood/domain test

# 7. Tudo (turbo)
pnpm test
pnpm typecheck
```

## Roadmap de execução

| Fase | Entregável | Status |
|---|---|---|
| F0 | Monorepo, domínio+testes, contratos, API skeleton, Docker, CI, ADRs | ✅ |
| F1 | Identidade/RBAC/LGPD/auditoria | ✅ |
| F2 | Parceiros (KYC/contratos/planos) + cardápio + Portal Parceiro | 🔜 |
| F3 | Pedido ponta-a-ponta + gateways + PWA cliente + Gestor de Pedidos (MVP) | 🔜 |
| F4 | Motor de despacho + App Entregador (Android) | 🔜 |
| F5 | Financeiro (comissões/repasses) + Admin completo | 🔜 |
| F6 | Apps Cliente/Parceiro nativos, marketing, avaliações, suporte, analytics | 🔜 |
| F7 | Landing CMS, docs site, k6/pen-test/UAT, stores | 🔜 |

## Convenções essenciais (ADR-0001)

- **Dinheiro em centavos inteiros** (`MoneyCents`), taxas em basis points — nunca float.
- **Regras de negócio 100% em `packages/domain`** com testes; apps nativos são *thin clients*.
- **Contrato-first**: OpenAPI da API gera SDKs Kotlin/Swift automaticamente.
- **Segurança desde o início**: helmet, CORS allowlist, validação de entrada, RBAC, 2FA admin, LGPD.
