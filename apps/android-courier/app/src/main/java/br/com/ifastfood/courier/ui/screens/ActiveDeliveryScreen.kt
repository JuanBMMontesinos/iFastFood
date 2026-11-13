package br.com.ifastfood.courier.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveDeliveryScreen(
    orderCode: String,
    storeName: String,
    customerAddress: String,
    currentStatus: String, // ACCEPTED, PICKED_UP, IN_ROUTE, DELIVERED
    onAction: (action: String, pin: String) -> Unit
) {
    var pinCode by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Corrida Ativa: $orderCode") }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Status: $currentStatus",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary
                )

                Spacer(modifier = Modifier.height(16.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("🏪 Lojista: $storeName", style = MaterialTheme.typography.bodyLarge)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("🏡 Cliente: $customerAddress", style = MaterialTheme.typography.bodyLarge)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                when (currentStatus) {
                    "ACCEPTED" -> {
                        Text("Dirija-se ao restaurante para coletar o pedido.")
                    }
                    "PICKED_UP" -> {
                        Text("Pedido em mãos. Pronto para iniciar a rota até o cliente.")
                    }
                    "IN_ROUTE" -> {
                        Text("Em rota para o endereço do cliente.")
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedTextField(
                            value = pinCode,
                            onValueChange = { if (it.length <= 4) pinCode = it },
                            label = { Text("PIN de Entrega (4 dígitos)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when (currentStatus) {
                    "ACCEPTED" -> {
                        Button(
                            onClick = { onAction("PICK_UP", "") },
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) {
                            Text("Confirmar Coleta no Restaurante")
                        }
                    }
                    "PICKED_UP" -> {
                        Button(
                            onClick = { onAction("IN_ROUTE", "") },
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) {
                            Text("Iniciar Viagem até o Cliente")
                        }
                    }
                    "IN_ROUTE" -> {
                        Button(
                            onClick = { onAction("DELIVER", pinCode) },
                            enabled = pinCode.length == 4,
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) {
                            Text("Confirmar Entrega com PIN")
                        }
                        OutlinedButton(
                            onClick = { onAction("RETURN_TO_MERCHANT", "") },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Devolver ao Restaurante")
                        }
                    }
                }
            }
        }
    }
}
