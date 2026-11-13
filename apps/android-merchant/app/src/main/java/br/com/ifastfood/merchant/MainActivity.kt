package br.com.ifastfood.merchant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

data class LiveOrder(
    val id: String,
    val code: String,
    val customerName: String,
    val itemsSummary: String,
    val totalBrl: String,
    val status: String
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val orders = remember {
                mutableStateListOf(
                    LiveOrder("1", "IF-8F3K2", "Lucas Almeida", "1x Pizza Calabresa Grande + 1x Coca-Cola 2L", "R$ 68,90", "PLACED"),
                    LiveOrder("2", "IF-4B9M1", "Mariana Souza", "2x X-Bacon Artesanal + 1x Batata Frita", "R$ 54,00", "PREPARING")
                )
            }

            Scaffold(
                topBar = {
                    @OptIn(ExperimentalMaterial3Api::class)
                    TopAppBar(
                        title = { Text("Gestor de Pedidos — Loja Aberta") }
                    )
                }
            ) { padding ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(orders) { order ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(order.code, style = MaterialTheme.typography.titleMedium)
                                    Text(order.totalBrl, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Cliente: ${order.customerName}", style = MaterialTheme.typography.bodyMedium)
                                Text(order.itemsSummary, style = MaterialTheme.typography.bodySmall)

                                Spacer(modifier = Modifier.height(12.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (order.status == "PLACED") {
                                        Button(
                                            onClick = { /* aceitar */ },
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("Aceitar & Preparar")
                                        }
                                    } else {
                                        Button(
                                            onClick = { /* pronto */ },
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("Pronto para Despacho")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
