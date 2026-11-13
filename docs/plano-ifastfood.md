# iFastFood — Plano Mestre de Implementação & Roadmap

Este documento é a **fonte da verdade** do planejamento do iFastFood, atualizado continuamente a cada fase do projeto.

---

## Topologia Geral do Produto (F0 a F7)

| Superfície | Tecnologia (ADR-0001) | Fase | Status |
|---|---|:---:|:---:|
| API (monólito modular) | NestJS + Prisma + Postgres/Supabase + Redis/BullMQ | F0→F7 | ✅ Concluído |
| App do Entregador | Android nativo (Kotlin + Compose) + SDK gerado | F4 | ✅ Concluído |
| Backoffice Executivo & KYC | Next.js 14 + Tailwind (`apps/admin`) | F5 | ✅ Concluído |
| App Nativo Cliente | Kotlin + Jetpack Compose (`apps/android-customer`) | F6 | ✅ Concluído |
| App Nativo Parceiro / PDV | Kotlin + Jetpack Compose (`apps/android-merchant`) | F6 | ✅ Concluído |
| Clientes Nativos iOS | Swift Package iOS 16+ (`apps/ios-apps`) | F6 | ✅ Concluído |
| Portal Institucional + CMS | Next.js 14 (`apps/web-landing`) + `CmsPage` | F7 | ✅ Concluído |

Convenções fixas: dinheiro em centavos inteiros (`MoneyCents`), taxas em basis points (`bps`), regras de negócio em
`packages/domain` (cobertura ≥ 85%), contratos Zod → OpenAPI → SDKs, conciliação contábil por partidas dobradas, auditoria em toda mutação
sensível, LGPD e zero tolerância a erros em testes.

---

## F2 — Parceiros + Cardápio ✅ (Concluído)
- **Backend:** Módulo de parceiros (`PartnersModule`: signup, perfil, horários, áreas de entrega, KYC, equipe, revisão admin, contratos e status) e `CatalogModule` (CRUD de categorias, produtos e complementos, reordenação atômica, pausa de produto e árvore do cardápio).
- **Banco:** Migration `20261103_partners_kyc` aplicada no Supabase (`MerchantDocument`).
- **Testes:** Unitários com 100% de sucesso nos services e na máquina de estados de parceiros.

---

## F3 — Pedido ponta a ponta + pagamentos Stripe + Descoberta + Cliente ✅ (Concluído)
- **Módulos de API & Domínio:**
  - `CustomerModule`: auto-provisionamento, perfil, catálogo de endereços (`Address`) com endereço padrão e geolocalização.
  - `DiscoveryModule`: feed geolocalizado de lojas abertas que entregam no endereço (`haversine`, raio da zona de entrega, taxa calculada e validação de funcionamento `isOpenNow` em tempo real no fuso America/Sao_Paulo).
  - `PaymentsModule`: gateway padrão **Stripe** (`StripeAdapter`), criação de `PaymentIntent`, webhooks idempotentes (`WebhookEvent`), estornos (`Refund`) e suporte a dinheiro/offline (`CASH`).
  - `OrdersModule`:
    - Checkout com cálculo estrito no servidor (`pricing.ts`): validação de itens, complementos, taxa de entrega, taxa de serviço e cupom;
    - Snapshot de contrato no pedido (comissão em bps e taxa de gateway);
    - Código público `IF-XXXXX`;
    - Linha do tempo de eventos (`OrderEventOrderState`);
    - Gestão de pedidos pelo parceiro (`GET /partners/me/orders` e `POST /partners/me/orders/:id/action`);
    - Transição permitida de `DISPATCHED -> DELIVERED` para entregas próprias da loja (Plano Básico).

---

## F4 — Motor de Despacho & App Entregador ✅ (Concluído)
- **Domínio (`packages/domain`):**
  - `dispatch-scoring.ts`: algoritmo de pontuação de entregadores (`scoreCourierOffer`: proximidade, pontualidade, taxa de aceite e direção);
  - Cálculo de repasse do entregador (`calculateCourierPayout`: tarifa base + km rodado + gorjeta 100%);
  - Validação de entrega segura por código PIN de 4 dígitos (`validateDeliveryPin`).
- **Contratos (`packages/contracts`):**
  - `courier.ts`: DTOs de cadastro, envio de CNH/veículo, aprovação de KYC e turnos de trabalho;
  - `logistics.ts`: DTOs de telemetria GPS ao vivo, oferta de entrega e validação de entrega por PIN.
- **Backend API (`apps/api`):**
  - `CourierModule`: onboarding, submissão de CNH/veículo, início/fim de turnos (`CourierShift`), aprovação de KYC;
  - `LogisticsModule`: ingestão de coordenadas GPS em tempo real, cálculo de rota e latência de entrega.
- **App do Entregador (`apps/android-courier`):**
  - Android nativo em Kotlin + Jetpack Compose;
  - `LocationForegroundService`: streaming contínuo de coordenadas GPS em segundo plano;
  - Telas de turno (`ShiftScreen`), ofertas disponíveis (`OffersScreen`) e entrega ativa (`ActiveDeliveryScreen`) com confirmação de PIN.

---

## F5 — Financeiro + Backoffice Completo ✅ (Concluído — MVP PRONTO PARA LANÇAMENTO)
- **Domínio Financeiro (`packages/domain`):**
  - `ledger.ts`: motor contábil de **partidas dobradas** (`Double-Entry Ledger`) com validação invariante: $\sum \text{Débitos} == \sum \text{Créditos}$;
  - Contas contábeis padronizadas: `GATEWAY_CLEARING`, `MERCHANT_PAYABLE`, `COURIER_PAYABLE`, `COMMISSION_REVENUE`, `SERVICE_FEE_REVENUE`, etc.
- **Contratos (`packages/contracts`):**
  - `finance.ts`: DTOs para Payouts periódicos, itens conciliados, saldo do entregador e auditoria do livro-razão.
- **Backend API (`apps/api`):**
  - `FinanceModule`: geração periódica de lotes de pagamento para lojistas (`generateMerchantPayout`) com desconto automático de mensalidade, consulta de extrato de ganhos do entregador e auditoria administrativa do livro-razão.
- **Backoffice Web (`apps/admin`):**
  - Aplicação moderna em **Next.js 14 + Tailwind CSS + Lucide Icons**:
    - Dashboard de métricas executivas (GMV, Receita Líquida, Pedidos, Entregadores);
    - Fila operacional de KYC com homologação de lojistas e entregadores em 1 clique;
    - Tabela do Ledger contábil em partidas dobradas com identificação de DÉBITO e CRÉDITO;
    - Formulário de geração de Payouts por período.

---

## F6 — Apps Nativos Cliente/Parceiro + Engajamento ✅ (Concluído)
- **Apps Nativos (Android Kotlin + iOS Swift):**
  - `apps/android-customer`: App nativo do cliente em Kotlin + Jetpack Compose (descoberta de restaurantes, cardápio, checkout Stripe e avaliação);
  - `apps/android-merchant`: Gestor de pedidos do parceiro em Kotlin + Jetpack Compose (fila de pedidos ao vivo, aceitar/preparar/despachar, pausar loja);
  - `apps/ios-apps`: Swift Package compartilhado para thin-clients iOS (Cliente, Entregador e Parceiro).
- **Módulos de Engajamento da API (`apps/api`):**
  - `MarketingModule`: validação de cupons promocionais (`validateCoupon`) integrando regras do domínio (`evaluateCoupon`);
  - `RatingModule`: avaliação de pedidos, restaurantes e entregadores (`createRating`) com recálculo atômico de médias móveis ponderadas (`ratingAvg`, `ratingCount`);
  - `SupportModule`: abertura e acompanhamento de tickets de suporte por persona (`CUSTOMER`, `MERCHANT`, `COURIER`) com histórico de mensagens.
- **Contratos (`packages/contracts`):**
  - `engagement.ts`: schemas para cupons (`ValidateCouponInput`), avaliações (`CreateRatingInput`, `RatingView`) e tickets (`CreateTicketInput`, `TicketView`).

---

## F7 — Lançamento, Landing CMS, Qualidade & Docs ✅ (Concluído)
- **Landing Web com CMS Dinâmico (`apps/web-landing`):**
  - Aplicação Next.js 14 + Tailwind CSS + Lucide Icons totalmente responsiva e com SEO otimizado;
  - Seções de alta conversão: Hero com badges de confiança, Seção para Clientes, Seção "Para Restaurantes" e Seção "Para Entregadores";
  - Formulário interativo de captura de leads (`LeadCaptureForm`) com feedback em tempo real e fallback resiliente;
  - Renderizador dinâmico de páginas CMS `/p/[slug]` integrado à tabela `CmsPage` do Prisma com fallback offline para páginas essenciais (`sobre-nos`, `termos-de-uso`, `politica-de-privacidade`).
- **Módulo CMS & Leads na API (`apps/api/src/cms`):**
  - `CmsService`, `CmsController` e `CmsModule` com endpoints: `GET /cms/pages`, `GET /cms/pages/:slug`, `POST /cms/pages` e `POST /cms/leads`;
  - DTOs em `packages/contracts/src/cms.ts` (`CmsPageDto`, `CmsSectionDto`, `LeadCaptureInput`, `UpsertCmsPageInput`);
  - Script de seed Prisma em `apps/api/prisma/seed.ts` para páginas institucionais padrão.
- **Testes de Carga & Confiabilidade (`tests/load`):**
  - `tests/load/k6-checkout.js`: teste de pico com 100 VUs concorrentes e garantia estrita de idempotência no Stripe / Banco;
  - `tests/load/k6-dispatch.js`: teste de streaming de coordenadas GPS e corrida de concorrência no aceite de entregas com latch atômico.
- **Documentação de API & Integrações (`docs/api`):**
  - `docs/api/partner-integration.md`: guia completo de integração de parceiros, PDV, cardápio, estados do pedido e webhooks Stripe;
  - `docs/api/courier-integration.md`: protocolo de telemetria GPS em segundo plano, gestão de turnos, motor de despacho e código PIN;
  - `docs/api/architecture-overview.md`: visão técnica e topologia do monorepo, fluxo ponta a ponta e convenções invariantes de domínio.
- **Hardening de Produção & Infraestrutura:**
  - `docker-compose.yml` multi-container orquestrando PostgreSQL, Redis, Meilisearch, API, Admin e Landing em profiles modulares;
  - Dockerfiles prontos para produção: `apps/web-landing/Dockerfile`, `apps/admin/Dockerfile`, `apps/api/Dockerfile`;
  - `docs/go-live-checklist.md`: checklist completo pré-lançamento cobrindo segredos, SSL/TLS, CORS, rate limiting, PITR no Supabase e observabilidade.
- **Testes & Qualidade Finais:**
  - 100% dos testes unitários passando:
    - `@ifastfood/domain`: 15 suítes / 119 testes com 94.62% de cobertura de código;
    - `@ifastfood/api`: 24 suítes / 84 testes passando sem falhas.
  - Typecheck com 0 erros em todos os 6 pacotes do monorepo;
  - Builds de produção do Turborepo 100% bem-sucedidos.

---

## Decisões Arquiteturais Consolidadas
1. **Apps nativos:** Mantidos 6 apps nativos (Kotlin + Swift) gerados via OpenAPI codegen (`packages/contracts/generators`).
2. **Gateway padrão:** **Stripe** como provedor padrão de pagamentos (com arquitetura multi-gateway para expansão futura).
3. **Escopo do MVP:** Lançamento oficial do MVP após a conclusão da fase **F5** (inclui Despacho + App Entregador + Financeiro + Backoffice). As fases F6 e F7 complementam os apps nativos, canais de engajamento, landing CMS e infraestrutura completa de lançamento.
4. **Banco de Dados & Migrações:** Migrations versionadas aplicadas diretamente no Supabase pela IA (`apps/api/prisma/migrations/`).
5. **Garantia de Qualidade & Git:** Cada fase só é finalizada após 100% dos testes unitários passarem sem erro, seguida de commit descritivo e push.
