# iFastFood — Protocolo de Telemetria & Integração do Entregador

Este documento detalha o protocolo de telemetria GPS em segundo plano, máquina de estados de turno e processo de despacho da frota de entregadores parceiros.

---

## 1. Ciclo de Vida do Turno

O entregador gerencia sua disponibilidade através de turnos (`CourierShift`):
- `START_SHIFT`: O entregador fica online no pool de despacho da sua zona geográfica.
- `PAUSE`: Pausa temporária para abastecimento ou refeição (não recebe ofertas).
- `END_SHIFT`: Encerra o turno de trabalho.

```http
POST /couriers/{courierId}/shifts
Content-Type: application/json

{
  "action": "START"
}
```

---

## 2. Telemetria GPS em Segundo Plano

O aplicativo Android do entregador executa um `LocationForegroundService` que transmite coordenadas a cada 3 a 5 segundos enquanto estiver em turno ativo:

```http
POST /logistics/couriers/{courierId}/location
Content-Type: application/json

{
  "lat": -23.5632,
  "lng": -46.6542,
  "speed": 38.2,
  "heading": 180.0,
  "accuracy": 4.5,
  "timestamp": "2026-11-13T12:00:00Z"
}
```

### 2.1. Otimizações de Bateria & Rede
- Se a velocidade do entregador for inferior a 1 km/h por mais de 30 segundos (parado em semáforo ou aguardando no restaurante), a taxa de envio é reduzida para 15 segundos.
- Coordenadas com precisão (`accuracy`) superior a 30 metros são descartadas pelo backend para evitar saltos irreais de mapa.

---

## 3. Motor de Despacho & Pontuação de Ofertas

O algoritmo de pontuação de despacho (`scoreCourierOffer` em `@ifastfood/domain`) calcula uma pontuação para cada entregador disponível próximo:

$$\text{Score} = (\text{Proximidade} \times 0.40) + (\text{Pontualidade Histórica} \times 0.30) + (\text{Taxa de Aceite} \times 0.20) + (\text{Alinhamento de Rota} \times 0.10)$$

### 3.1. Oferta e Aceite Concorrente (Latch Atômico)
As ofertas possuem validade de **30 a 45 segundos**. Quando múltiplos entregadores recebem uma notificação, o primeiro aceite é garantido atomicamente pelo backend:
```http
POST /logistics/deliveries/{deliveryId}/accept
Content-Type: application/json

{
  "courierId": "courier-123"
}
```
- Resposta `200 OK`: Oferta atribuída com sucesso ao entregador.
- Resposta `409 Conflict`: Oferta já aceita por outro parceiro (o app deve remover o card imediatamente).

---

## 4. Finalização Segura com Código PIN

Para evitar entregas extraviadas ou fraudes de recebimento:
1. O cliente visualiza no seu app um código secreto de 4 dígitos (ex: `7492`).
2. O entregador solicita o código verbalmente no momento da entrega.
3. O entregador digita o código no aplicativo:

```http
POST /logistics/deliveries/{deliveryId}/complete
Content-Type: application/json

{
  "courierId": "courier-123",
  "pin": "7492"
}
```
Se o PIN for inválido após 3 tentativas, o fluxo entra em alerta e aciona a Central de Suporte. Com o PIN correto, a entrega é concluída e os ganhos são creditados imediatamente na carteira do entregador.
