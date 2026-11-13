# iFastFood — Visão Geral da Arquitetura do Sistema

Este documento descreve a topologia técnica, a divisão de responsabilidades entre os pacotes e a infraestrutura que sustentam a plataforma **iFastFood**.

---

## 1. Topologia do Monorepo

O repositório é gerenciado via **Turborepo** e **pnpm v12** com isolamento estrito de dependências:

```
iFastFood/
├── apps/
│   ├── api/                 # Monólito modular NestJS (TypeScript, Prisma, Swagger)
│   ├── admin/               # Backoffice executivo Next.js 14 (Tailwind, Lucide)
│   ├── web-landing/         # Portal institucional & CMS Next.js 14
│   ├── android-courier/     # App nativo Android Entregador (Kotlin + Jetpack Compose)
│   ├── android-customer/    # App nativo Android Cliente (Kotlin + Jetpack Compose)
│   ├── android-merchant/    # App nativo Android Restaurante / PDV (Kotlin + Compose)
│   └── ios-apps/            # Swift Package com clientes nativos iOS 16+
│
├── packages/
│   ├── contracts/           # DTOs compartilhados, schemas Zod e OpenAPI generator
│   ├── domain/              # Regras de negócio puras (MoneyCents, ledger, scoring, cupons)
│   └── ui-tokens/           # Tokens visuais (cores, tipografia, espaçamentos)
│
├── docs/                    # Planejamento mestre, ADRs e especificações técnicas
└── tests/load/              # Scripts k6 de simulação de carga extrema
```

---

## 2. Invariantes de Domínio & Precisão Financeira

1. **Moeda Inteira (`MoneyCents`):**
   Todos os valores são armazenados como números inteiros de centavos (ex: `R$ 49,90` = `4990`). Nunca são utilizados tipos de ponto flutuante (`float`/`double`) para valores monetários.
2. **Taxas em Basis Points (`bps`):**
   Comissões e taxas percentuais utilizam basis points ($1\% = 100\text{ bps}$). Exemplo: $12\% = 1200\text{ bps}$.
3. **Livro-Razão Contábil de Partidas Dobradas:**
   Para toda transação financeira (pagamento de pedido, taxa da plataforma, repasse de entrega, estorno), a soma dos débitos **deve ser rigorosamente igual** à soma dos créditos:
   $$\sum \text{Débitos} = \sum \text{Créditos}$$
4. **Isolamento de Regras Puras:**
   O pacote `@ifastfood/domain` é 100% livre de dependências de infraestrutura (sem banco de dados, sem HTTP, sem timers), coberto por testes unitários com mais de 94% de cobertura de código.

---

## 3. Banco de Dados & Camada de Persistência

- **Engine:** PostgreSQL 16 hospedado no Supabase.
- **ORM:** Prisma v6 com migrations versionadas.
- **Criptografia em Repouso:** Dados pessoais identificáveis (PII) e chaves sensíveis passam por cifra AES-256-GCM antes da persistência.
- **Conformidade LGPD:** Suporte nativo a procedimentos de anonimização e exportação de dados (DSAR).

---

## 4. Integração Stripe & Multi-Gateway

O subsistema de pagamentos (`PaymentsModule`) abstrai provedores através de interfaces comuns:
- **Gateway Padrão:** Stripe (Cartão de Crédito/Débito, Apple Pay, Google Pay).
- **Idempotência Garantida:** Cada transação exige um cabeçalho `Idempotency-Key` único. Requisições repetidas retornam a mesma transação sem criar cobranças duplicadas.
- **Tratamento de Webhooks:** Assinaturas criptográficas `stripe-signature` validadas em tempo de execução.

---

## 5. Aplicativos Nativos & OpenAPI Codegen

Os clientes nativos móveis consomem as definições centralizadas em `packages/contracts`:
1. `npm run export:openapi`: exporta o schema consolidado em `packages/contracts/generators/openapi/openapi.json`.
2. Modelos Kotlin (Android) e Swift (iOS) são gerados a partir do OpenAPI, mantendo 100% de paridade com o backend sem discrepâncias de tipos.
