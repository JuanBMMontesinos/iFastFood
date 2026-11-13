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

## F3 — Pedido ponta a ponta + pagamentos + PWA do cliente + Gestor de Pedidos (MVP)
**Módulos de API**
- `CustomerModule`: perfil, endereços (`Address`) e geocodificação (Google Maps).
- `DiscoveryModule`: lojas abertas que entregam no endereço (zonas RADIUS/POLYGON + `haversine` +
  `isOpenNow`), página da loja e cardápio público. Busca com Meilisearch (profile `search`).
- `CartModule` (Redis): carrinho por loja; validação de complementos (min/max/required).
- `OrderModule`:
  - checkout com cálculo no servidor: itens + frete (`delivery-fee`) + taxa de serviço
    (`AppConfig`, R\$ 0,99–2,49) − cupom (`coupon`);
  - snapshot do contrato no pedido (comissão/taxa em bps);
  - transições sempre via `assertOrderTransition`, gravando `OrderEventOrderState`;
  - código público `IF-XXXXX`;
  - expiração automática do aceite (5 min, job BullMQ).
- `PaymentModule`: `PaymentGatewayPort` com adaptadores **Mercado Pago** (PIX + cartão) e
  **Stripe**; `CASH`/`OFFLINE`; webhooks idempotentes (`WebhookEvent`); estornos (`Refund`).
  Escopo PCI SAQ-A (tokenização no gateway).
- `RealtimeModule`: WebSocket/SSE para o status do pedido (cliente) e para novos pedidos (Gestor).
- `NotificationModule`: push (FCM), e-mail (Resend) e SMS, com fila e tabela `Notification`.

**Frontends**
- `web-customer` (PWA): login por OTP, endereço, lista de lojas, loja/cardápio, carrinho, checkout
  (PIX com QR e cartão), acompanhamento em tempo real, histórico.
- `web-merchant` → Gestor de Pedidos: fila com alerta sonoro, aceitar/recusar, preparo, pronto,
  impressão do pedido, pausar produto ou loja.

**Domínio novo:** cálculo do total do pedido, validação do carrinho/complementos, geração de
código, cálculo de comissão por pedido.

**Pronto quando:** cliente faz o pedido com PIX de sandbox → webhook confirma → loja aceita e
prepara → pedido marcado como entregue (entrega própria da loja, plano BÁSICO).

## F4 — Motor de despacho + App do Entregador (Android)
- `CourierModule`: onboarding, documentos (CNH, CRLV, selfie...), revisão admin
  (`CourierStatus`), turnos (`CourierShift`), fechamento automático por segurança.
- `LogisticsModule`:
  - ingestão de GPS (`CourierLocation` + Redis GEO para "entregadores próximos");
  - **motor de despacho**: oferta sequencial ou em lote com timeout, raio crescente e score
    (distância, avaliação, carga); máquina de estado `delivery/state-machine` (já existe);
  - repasse do entregador (`feeCourierCents`);
  - comprovante de entrega (código de 4 dígitos ou foto em `proofUrl`);
  - retorno à loja.
- Rastreamento ao vivo no PWA do cliente e no Gestor.
- **App Android do entregador** (Kotlin, Jetpack Compose, SDK gerado do OpenAPI): login,
  documentos, ficar online, receber e aceitar oferta, navegação, coleta, entrega, ganhos.
  GPS em foreground service. Testes Maestro no CI.
- Infra de codegen: publicar a spec OpenAPI completa e gerar `kotlin-client` e `swift-client`
  (configs já existem em `packages/contracts/generators`).

**Pronto quando:** pedido de loja no plano ENTREGA é ofertado, aceito, coletado e entregue
pelo app, com rastreio ao vivo.

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

## Decisões em aberto [DECIDIR]
1. **Apps nativos:** manter 6 apps nativos (Kotlin + Swift), conforme o ADR-0001, ou reduzir
   custo (por exemplo, só o entregador nativo, e cliente/parceiro como PWA)?
2. **Gateway inicial:** Mercado Pago primeiro (PIX), Stripe depois?
3. **Hospedagem de produção:** onde a API e os frontends vão rodar?
4. **Cidade/região piloto** (afeta zonas, mapas e o despacho).
5. **Escopo do MVP:** lançar após F3 (entrega própria da loja) ou só após F4/F5?
