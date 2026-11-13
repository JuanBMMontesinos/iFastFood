# iFastFood — Guia de Integração de Parceiros & Restaurantes

Este documento fornece as diretrizes para restaurantes parceiros, desenvolvedores de PDV (Ponto de Venda) e integradores de cardápio conectarem seus sistemas à API do **iFastFood**.

---

## 1. Visão Geral & Especificação OpenAPI

Toda a API é tipada ponta a ponta e documentada via OpenAPI 3.0:
- **Swagger UI (Dev):** `http://localhost:3001/docs`
- **Arquivo OpenAPI:** `packages/contracts/generators/openapi/openapi.json`
- **Geração de SDKs:** Execute `pnpm run codegen` para gerar clientes em TypeScript, Kotlin ou Swift.

---

## 2. Autenticação

As chamadas autenticadas utilizam **Bearer JWT** com rotação de tokens:
```http
Authorization: Bearer <seu_token_jwt>
```
Para sistemas PDV e integrações M2M (Machine to Machine), utiliza-se o par `client_id` e `client_secret` emitido no Portal do Parceiro.

---

## 3. Sincronização de Cardápio (`/catalog` & `/partners`)

### 3.1. Estrutura de Preços (MoneyCents)
Todos os valores monetários são expressos em **centavos inteiros** para evitar erros de ponto flutuante:
- R$ 25,50 = `2550`
- R$ 0,00 = `0`

### 3.2. Atualização em Lote de Produtos
```http
PUT /partners/{merchantId}/menu
Content-Type: application/json

{
  "categories": [
    {
      "name": "Hambúrgueres Artesanais",
      "sortOrder": 1,
      "items": [
        {
          "externalId": "pdv-item-101",
          "name": "Smash Burger Duplo",
          "description": "2x carnes 100g, cheddar inglês e molho especial",
          "priceCents": 3200,
          "available": true,
          "optionGroups": [
            {
              "name": "Ponto da Carne",
              "required": true,
              "minSelections": 1,
              "maxSelections": 1,
              "options": [
                { "name": "Ao Ponto", "priceCents": 0 },
                { "name": "Bem Passado", "priceCents": 0 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 4. Gestão de Pedidos & Máquina de Estados

### 4.1. Estados do Pedido
1. `SUBMITTED`: Pedido criado pelo cliente, aguardando confirmação de pagamento.
2. `PAID`: Pagamento processado pelo Stripe.
3. `CONFIRMED`: Restaurante aceitou o pedido no PDV ou no App Gestor.
4. `IN_PREPARATION`: Cozinha iniciou a confecção.
5. `READY_FOR_PICKUP`: Embalado e pronto para coleta pelo entregador parceiro.
6. `DISPATCHED`: Entregador coletou o pacote e está em rota.
7. `DELIVERED`: Entregador validou o PIN de 4 dígitos informado pelo cliente.
8. `CANCELED`: Pedido cancelado com estorno contábil correspondente.

### 4.2. Notificação via Webhook
Configure seu webhook em **Configurações > Webhooks** no Portal do Parceiro para receber eventos:
```json
{
  "event": "order.paid",
  "timestamp": "2026-11-13T12:00:00Z",
  "data": {
    "orderId": "ord_8f43a9b2",
    "displayId": "#1042",
    "merchantId": "merch_1",
    "totalCents": 4500,
    "items": [
      {
        "name": "Smash Burger Duplo",
        "quantity": 1,
        "priceCents": 3200
      }
    ],
    "deliveryType": "MARKETPLACE",
    "preparationTimeMinutes": 25
  }
}
```

---

## 5. Webhooks de Pagamento Stripe

O processamento financeiro do iFastFood é orquestrado via Stripe com **idempotência estrita**:
- O endpoint `/payments/webhook/stripe` recebe e valida a assinatura criptográfica (`stripe-signature`).
- Eventos duplicados são descartados automaticamente por idempotência na tabela `WebhookEvent`.
- Ao receber `payment_intent.succeeded`, o status do pedido transiciona automaticamente para `PAID` e as partidas dobradas são escrituradas no livro-razão (`LedgerEntry`).

---

## 6. Ambiente de Sandbox / Homologação

Para testes:
- Base URL: `http://localhost:3001`
- Chave de Teste Stripe: `sk_test_...`
- Webhook Secret Teste: `whsec_...`
- Cartão de Teste: `4242 4242 4242 4242`, Validade: Futura, CVC: Qualquer 3 dígitos.
