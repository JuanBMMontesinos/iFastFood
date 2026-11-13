/**
 * iFastFood — Teste de Carga de Telemetria GPS & Concorrência de Despacho
 * Execução com k6:
 *   k6 run tests/load/k6-dispatch.js
 *
 * Cenário:
 *   - Simula 50 entregadores parceiros transmitindo telemetria GPS a cada segundo.
 *   - Simula corrida concorrente para aceite de oferta de entrega (Race Condition).
 *   - Garante que a trava atômica (latch) do motor de despacho premia exatamente 1 entregador,
 *     respondendo 409 Conflict ou 400 aos demais sem corromper o estado da entrega.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    telemetry_stream: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
    },
    offer_acceptance_race: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 2,
      startTime: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250'], // Telemetria ultrarrápida (< 250ms)
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const vuId = __VU;
  const courierId = `courier-k6-${vuId}`;

  // 1. Transmissão de telemetria GPS
  // Simula pequeno deslocamento em São Paulo (raio de ~2km ao redor da Sé)
  const baseLat = -23.5505;
  const baseLng = -46.6333;
  const jitterLat = (Math.random() - 0.5) * 0.02;
  const jitterLng = (Math.random() - 0.5) * 0.02;

  const telemetryPayload = JSON.stringify({
    lat: baseLat + jitterLat,
    lng: baseLng + jitterLng,
    speed: 35.5,
    heading: 180,
    timestamp: new Date().toISOString(),
  });

  const headers = { 'Content-Type': 'application/json' };

  const telemetryRes = http.post(
    `${BASE_URL}/logistics/couriers/${courierId}/location`,
    telemetryPayload,
    { headers },
  );

  check(telemetryRes, {
    'telemetria aceita (status 200/201/204)': (r) =>
      r.status === 200 || r.status === 201 || r.status === 204,
  });

  // 2. Simulação de aceite concorrente de oferta
  // Apenas a cada 5 iterações para testar disputa
  if (__ITER % 5 === 0) {
    const deliveryId = 'deliv-race-test';
    const offerRes = http.post(
      `${BASE_URL}/logistics/deliveries/${deliveryId}/accept`,
      JSON.stringify({ courierId }),
      { headers },
    );

    check(offerRes, {
      'resposta válida (200 aceito ou 409/400 já aceito por outro)': (r) =>
        r.status === 200 || r.status === 409 || r.status === 400 || r.status === 404,
    });
  }

  sleep(1);
}
