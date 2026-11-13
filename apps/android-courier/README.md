# iFastFood — App do Entregador (Android Nativo) 🏍️📦

Aplicativo nativo Android para entregadores parceiros da plataforma iFastFood, desenvolvido em **Kotlin** com **Jetpack Compose**, seguindo a arquitetura definida na [ADR-0001](../../docs/adr/0001-decisoes-arquiteturais.md).

## Características Arquiteturais

1. **Thin Client sobre OpenAPI:**
   - A especificação OpenAPI completa gerada pela API do NestJS (`packages/contracts/generators/openapi/openapi.json`) é consumida via `packages/contracts/generators/kotlin-client.yaml` para gerar o SDK Kotlin com OkHttp e Kotlin Coroutines.
2. **Foreground Location Service (`LocationForegroundService`):**
   - Rastreamento contínuo em segundo plano quando o entregador está em turno ativo (`ACTIVE`) ou em rota de entrega (`IN_DELIVERY`).
   - Notificação persistente no sistema Android em conformidade com as diretrizes do Google Play (Android 14+).
3. **Fluxo de Telas (Jetpack Compose):**
   - **Onboarding & KYC:** Cadastro do veículo (moto, carro, bike, van) e envio de documentos (CNH, CRLV, Selfie).
   - **Turnos (Online/Offline):** Controle de jornada com fechamento automático de segurança (> 12h) e cálculo de ganhos.
   - **Ofertas de Corridas:** Lista de pedidos no raio do entregador ordenados pelo algoritmo de despacho (`dispatch-scoring.ts`), exibindo loja de coleta, endereço de entrega, km e valor do repasse em BRL.
   - **Corrida Ativa:** Trilha de transições de status (`ACCEPTED` → `PICKED_UP` → `IN_ROUTE` → `DELIVERED` / `RETURNED_TO_MERCHANT`) com validação de código PIN de 4 dígitos ou foto de comprovante.

## Como Executar

Pré-requisitos: Android Studio (versão Ladybug ou superior), JDK 17+.

```bash
# Abrir o projeto apps/android-courier no Android Studio
# ou via linha de comando:
./gradlew assembleDebug
```
