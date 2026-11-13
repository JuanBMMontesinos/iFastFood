# Plano do projeto iFastFood (reconstruído)

> Plano reconstruído em 13/11/2026 a partir do que existe no repositório: README, ADR-0001,
> `schema.prisma` (50 tabelas), `packages/domain` e o código de F0–F2. Ele substitui o plano
> original, que se perdeu (`ifastfood-plan.md`).
> Tudo o que está marcado com **[DECIDIR]** precisa de confirmação do responsável pelo produto.

## Visão
Marketplace de delivery (comida, mercado, farmácia, bebidas) no estilo iFood, com 5 superfícies:

| Superfície | Tecnologia (ADR-0001) | Fase |
|---|---|---|
| API (monólito modular) | NestJS + Prisma + Postgres/Supabase + Redis/BullMQ | F0→F7 |
| PWA do cliente | Next.js (`apps/web-customer`) | F3 |
| Portal do Parceiro + Gestor de Pedidos | Next.js (`apps/web-merchant`) | F2/F3 |
| Backoffice | Next.js + shadcn/ui (`apps/admin`) | F5 |
| App do Entregador | Android nativo (Kotlin) + SDK gerado | F4 |
| Apps nativos Cliente/Parceiro | Kotlin + Swift + SDKs gerados | F6 |
| Landing + CMS | Next.js (`apps/web-landing`) + `CmsPage` | F7 |

Convenções fixas: dinheiro em centavos inteiros, taxas em basis points (bps), regras de negócio em
`packages/domain` (cobertura ≥ 85%), contratos Zod → OpenAPI → SDKs, auditoria em toda mutação
sensível, LGPD.

---

## F2 — Parceiros + Cardápio ✅ (Concluído no Backend / Domínio / Contratos / Migrations)
**Backend:** módulo de parceiros (`PartnersModule`: signup, perfil, horários, áreas de entrega, KYC, equipe, revisão admin, contratos e status) e `CatalogModule` (CRUD de categorias, produtos e complementos, reordenação atômica, pausa de produto e árvore do cardápio).
**Banco:** migration `20261103_partners_kyc` aplicada no Supabase (`MerchantDocument`).
**Testes:** unitários com 100% de sucesso nos services e na máquina de estados de parceiros.
**Status:** Backend concluído e testado. A interface web do `web-merchant` será construída em conjunto com o Gestor de Pedidos.

## F3 — Pedido ponta a ponta + pagamentos Stripe + Descoberta + Cliente ✅ (Concluído no Backend / Domínio / Contratos / Testes)
**Módulos de API & Domínio:**
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
- **Testes & Qualidade:** 100% dos testes unitários passando (13 suítes / 106 testes no `@ifastfood/domain` com 95.65% de cobertura; 17 suítes / 56 testes no `@ifastfood/api`). Typecheck com zero erros.
- **Frontends previstos:** PWA `web-customer` e painel `web-merchant` para consumo dos contratos e endpoints validados.

## F4 — Motor de despacho + App do Entregador (Android) ✅ (Concluído no Domínio, Backend, App Nativo, Spec OpenAPI e Testes)
- **Domínio (`packages/domain`):**
  - Algoritmo de despacho e pontuação (`dispatch-scoring.ts`): cálculo ponderado por avaliação, proximidade geográfica, penalidade por carga ativa e adequação veicular (`calculateCourierScore`, `rankCouriersForOffer`);
  - Repasse ao entregador (`calculateCourierFee`): valor fixo de saída + valor por quilômetro com piso mínimo;
  - Validação estrita do código PIN de confirmação de entrega de 4 dígitos (`verifyDeliveryPin`).
- **Contratos (`packages/contracts`):**
  - `courier.ts`: schemas de perfil, onboarding, upload de documentos (CNH, CRLV, Selfie, etc.), turnos e revisão de KYC;
  - `logistics.ts`: schemas de ofertas de corridas (`DeliveryOfferDto`), ações de entrega (`DeliveryActionInput`), rastreamento ao vivo (`DeliveryTrackingDto`, `CourierLiveLocation`).
- **Módulos de API (`apps/api`):**
  - `CourierModule`: perfil, auto-provisionamento, upload de CNH/Selfie com transição para `PENDING_REVIEW`, turnos de jornada (`CourierShift`) com fechamento automático de segurança (> 12h) e revisão administrativa;
  - `LogisticsModule`: ingestão de GPS (`CourierLocation`), criação de entrega (`Delivery`), listagem de ofertas no raio do entregador, transições de estado (`assertDeliveryTransition`), confirmação por PIN de 4 dígitos e rastreamento em tempo real para o cliente/lojista;
  - Exportação e publicação automática da especificação OpenAPI completa (`packages/contracts/generators/openapi/openapi.json`) e rotas `/docs` e `/docs-json`.
- **App Android Nativo (`apps/android-courier`):**
  - Desenvolvido em Kotlin + Jetpack Compose como thin client sobre a API/OpenAPI;
  - `LocationForegroundService`: rastreamento GPS contínuo em segundo plano durante o turno ativo;
  - Telas interativas para gestão de turnos (Online/Offline), listagem de corridas disponíveis e acompanhamento passo-a-passo da corrida com confirmação por PIN.
- **Testes & Qualidade:** 100% dos testes unitários passando (14 suítes / 114 testes no `@ifastfood/domain` com 95.65% de cobertura; 19 suítes / 69 testes no `@ifastfood/api`). Typecheck com 0 erros.

## F5 — Financeiro + Backoffice completo
- `FinanceModule`:
  - **ledger em partidas dobradas** (`LedgerAccount`/`LedgerEntry`) lançado a cada evento
    (pago, estornado, chargeback, repasse);
  - comissões via `tax-rules`;
  - **repasses** periódicos ao parceiro (`Payout`/`PayoutItem`, job semanal ou quinzenal):
    bruto − comissão − taxa de pagamento online − mensalidade;
  - mensalidade acima de R\$ 1.800/mês (`Invoice`);
  - conciliação com os gateways;
  - extrato no Portal do Parceiro;
  - ganhos do entregador.
- `apps/admin` (Next.js + shadcn/ui):
  - dashboards;
  - usuários e RBAC (API da F1);
  - fila de KYC de parceiros e entregadores;
  - contratos e planos;
  - pedidos (busca, linha do tempo, cancelar/estornar);
  - entregas ao vivo (mapa);
  - financeiro (repasses, ledger, conciliação);
  - cupons;
  - `AppConfig`;
  - auditoria.
  Exige 2FA.
- CI: `pnpm audit` passa a bloquear o merge (hoje está com `continue-on-error`).

**Pronto quando:** fechamento de período gera repasses que batem com o ledger; o admin opera a
plataforma sem acessar o banco.

## F6 — Apps nativos Cliente/Parceiro + engajamento
- Apps nativos **Cliente** (Android + iOS) e **Parceiro/Gestor** (Android + iOS), mais **Entregador
  iOS**, todos thin clients sobre os SDKs gerados.
- `MarketingModule`: cupons de loja e de plataforma (admin + portal), campanhas, banners,
  push segmentado, assinatura do cliente (`SubscriptionPlan`/`CustomerSubscription`, tipo
  "Clube"), carteira e cashback (`Wallet`).
- `RatingModule`: avaliação da loja e do entregador, médias, moderação.
- `SupportModule`: tickets por persona (`SupportTicket`/`TicketMessage`), chat no pedido,
  SLA/prioridade, notas internas, fila no admin.
- Analytics: eventos de produto e métricas de loja (vendas, ticket médio, cancelamentos) no
  portal.

## F7 — Lançamento
- `web-landing` com CMS (`CmsPage`): páginas institucionais, "seja parceiro", "seja
  entregador", SEO.
- Site de documentação (API e parceiros).
- **Qualidade/segurança:** testes de carga k6 (checkout, despacho, webhooks), pen-test, revisão
  LGPD/DPIA, UAT.
- **Produção:** deploy (API em container, Supabase pooler, Redis gerenciado), observabilidade
  (logs, métricas, tracing, alertas), backups, gestão de segredos.
- **Lojas:** publicação na Play Store e na App Store (políticas de localização em background
  para o entregador).

---

## Decisões Arquiteturais Consolidadas
1. **Apps nativos:** Mantidos 6 apps nativos (Kotlin + Swift) gerados via OpenAPI codegen (`packages/contracts/generators`).
2. **Gateway padrão:** **Stripe** como provedor padrão de pagamentos (com arquitetura multi-gateway para expansão futura).
3. **Escopo do MVP:** Lançamento oficial do MVP após a conclusão da fase **F5** (inclui Despacho + App Entregador + Financeiro + Backoffice).
4. **Banco de Dados & Migrações:** Migrations versionadas aplicadas diretamente no Supabase pela IA (`apps/api/prisma/migrations/`).
5. **Garantia de Qualidade & Git:** Cada fase só é finalizada após 100% dos testes unitários passarem sem erro, seguida de commit descritivo e push.
