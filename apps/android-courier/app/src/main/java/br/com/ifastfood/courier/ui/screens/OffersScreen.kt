package br.com.ifastfood.courier.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class DeliveryOfferItem(
    val id: String,
    val orderCode: String,
    val storeName: String,
    val storeAddress: String,
    val customerAddress: String,
    val distanceKm: Double,
    val feeBrl: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OffersScreen(
    offers: List<DeliveryOfferItem>,
    onAcceptOffer: (String) -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Corridas Disponíveis") },
                navigationIcon = {
                    TextButton(onClick = onBack) {
                        Text("Voltar")
                    }
                }
            )
        }
    ) { padding ->
        if (offers.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                Text("Nenhuma corrida disponível no seu raio no momento.")
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(offers) { offer ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = offer.orderCode,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = offer.feeBrl,
                                    style = MaterialTheme.typography.titleLarge,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                            Text("📍 Coleta: ${offer.storeName} (${offer.storeAddress})")
                            Text("🏁 Entrega: ${offer.customerAddress}")
                            Text("📏 Distância total estimada: ${offer.distanceKm} km")

                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { onAcceptOffer(offer.id) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Aceitar Corrida")
                            }
                        }
                    }
                }
            }
        }
    }
}
