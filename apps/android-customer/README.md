# iFastFood — App do Cliente (Android Nativo) 🍔🍕📱

Aplicativo nativo Android para clientes finais do iFastFood, desenvolvido em **Kotlin** com **Jetpack Compose** e **Material 3**, seguindo as diretrizes de thin-client do [ADR-0001](../../docs/adr/0001-decisoes-arquiteturais.md).

## Telas & Funcionalidades
1. **Descoberta Geolocalizada:** Feed de restaurantes abertos por raio e taxa de entrega calculada via Haversine.
2. **Cardápio Interativo:** Navegação por categorias, itens e opcionais (mínimo/máximo/obrigatório).
3. **Checkout Seguro com Stripe:** Pagamento integrado via cartão de crédito ou PIX dinâmico com QR Code.
4. **Rastreio em Tempo Real:** Acompanhamento ao vivo do pedido e do entregador via GPS.
5. **Avaliações & Cupons:** Aplicação de cupons promocionais e avaliação do restaurante e do entregador.
