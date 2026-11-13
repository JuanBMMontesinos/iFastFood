package br.com.ifastfood.customer

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

data class RestaurantCard(
    val id: String,
    val name: String,
    val category: String,
    val ratingAvg: Double,
    val deliveryFeeBrl: String,
    val etaMinutes: String
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val restaurants = listOf(
                RestaurantCard("1", "Pizzaria Bella Napoli", "Pizza", 4.9, "R$ 5,90", "30-40 min"),
                RestaurantCard("2", "Burger Prime Artesanal", "Hambúrguer", 4.8, "Grátis", "25-35 min"),
                RestaurantCard("3", "Sushi Express", "Japonesa", 4.7, "R$ 7,50", "40-50 min")
            )

            Scaffold(
                topBar = {
                    @OptIn(ExperimentalMaterial3Api::class)
                    TopAppBar(
                        title = { Text("iFastFood — O que vai pedir hoje?") }
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
                    items(restaurants) { r ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(r.name, style = MaterialTheme.typography.titleMedium)
                                    Text("⭐ ${r.ratingAvg}", style = MaterialTheme.typography.labelLarge)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("${r.category} • ${r.etaMinutes} • Frete: ${r.deliveryFeeBrl}", style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}
