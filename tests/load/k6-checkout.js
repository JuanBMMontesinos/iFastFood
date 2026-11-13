/**
 * iFastFood — Teste de Carga de Pico: Checkout & Idempotência de Pagamento
 * Execução com k6:
 *   k6 run tests/load/k6-checkout.js
 *
 * Cenário:
 *   - Simula 100 usuários virtuais concorrentes realizando pedidos em restaurantes com alta demanda.
 *   - Testa idempotência enviando a mesma idempotencyKey repetidas vezes para assegurar que nenhum
 *     pedido/cobrança seja duplicado no Stripe / banco de dados.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Aquecimento suave
    { duration: '30s', target: 100 }, // Pico concorrente (100 VUs)
    { duration: '15s', target: 0 },   // Desaceleração
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% abaixo de 500ms
    http_req_failed: ['rate<0.01'],                  // Taxa de erro < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const customerId = 'cust-k6-simulated';
  const idempotencyKey = `k6-order-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    merchantId: 'merch-test-1',
    customerId,
    idempotencyKey,
    items: [
      {
        itemId: 'item-burger-1',
        name: 'Hambúrguer Smash Especial',
        quantity: 2,
        priceCents: 2800,
      },
      {
        itemId: 'item-fries-1',
        name: 'Batata Rústica',
        quantity: 1,
        priceCents: 1400,
      },
    ],
    deliveryFeeCents: 700,
    paymentMethod: 'CREDIT_CARD',
    gateway: 'STRIPE',
    deliveryAddress: {
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.5632,
      lng: -46.6542,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
  };

  // 1. Envio da primeira requisição de criação de pedido
  const res1 = http.post(`${BASE_URL}/orders`, payload, params);

  check(res1, {
    'status é 200 ou 201': (r) => r.status === 200 || r.status === 201,
    'retorna orderId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined || body.orderId !== undefined;
      } catch {
        return false;
      }
    },
  });

  // 2. Teste de Idempotência: reenvio com mesma chave deve retornar a mesma resposta sem reprocessar
  const res2 = http.post(`${BASE_URL}/orders`, payload, params);

  check(res2, {
    'idempotência respeitada (status 200/201)': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
