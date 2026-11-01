# ADR-0001 — Decisões de arquitetura fundamentais

- **Status:** Aceito
- **Data:** 2026-11-01
- **Contexto:** plano completo em `ifastfood-plan.md`; pesquisa do modelo iFood documentada no plano.

## Decisões

### 1. Backend: monólito modular (NestJS/TypeScript)
Módulos de domínio isolados (`identity`, `catalog`, `order`, `logistics`, `payments`,
`finance`, `marketing`, `support`, `admin`) com barramento de eventos interno
(BullMQ/Redis; abstração de broker). Evolução para microsserviços sem reescrita.
*Motivo:* menor custo operacional no estágio atual, mantendo fronteiras claras
(o iFood, na escala deles, roda Node/TS + Kafka — a linguagem já provou o domínio).

### 2. Mobile nativo (Kotlin/Swift) com mitigação de custo
6 apps (3 × 2 plataformas) compartilhando módulos Gradle / SwiftPackages +
**SDKs gerados do OpenAPI** (`openapi-generator-cli`). Apps são **thin clients**:
regra de negócio mora no backend e em `packages/domain`; apps apenas renderizam estado.
*Motivo:* decisão do produto (nativo); conformidade GPS em background p/ entregadores.

### 3. Pagamentos: abstração com dois adaptadores (Mercado Pago + Stripe)
Porta `PaymentGatewayPort`; eventos normalizados; webhooks idempotentes
(`WebhookEvent` com `@@unique([gateway, externalId])`); escopo PCI-DSS SAQ-A
(tokenização no gateway).

### 4. Dinheiro: centavos inteiros + basis points
Nenhum float em regras financeiras (`packages/domain/src/money.ts`).
Ledger em partidas dobradas (`LedgerAccount`/`LedgerEntry`).

### 5. Modelos de cobrança espelham o iFood como parâmetros
Planos Básico (12% + 3,2% + R$110 acima de R$1.800/mês) e Entrega (23% + 3,2% + R$150);
taxa de serviço do cliente R$ 0,99–2,49. Valores nas tabelas `MerchantContract`
e `AppConfig` — **configuráveis no backoffice, não fixos em código**.

### 6. Testes primeiro no domínio
Gate de cobertura ≥ 85% em `packages/domain` (Vitest); Jest nos apps Nest;
Maestro para mobile no CI; k6 para carga (F7).

## Consequências
- Fronteiras modulares precisam ser respeitadas desde a F1 (evita big-ball-of-mud).
- Codegen mobile exige disciplina de OpenAPI (spec completa sempre publicada).
- Custo de manter 6 bases nativas é mitigado por contratos + design tokens.
