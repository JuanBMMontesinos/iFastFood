package br.com.ifastfood.courier.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftScreen(
    isOnline: Boolean,
    onToggleShift: (Boolean) -> Unit,
    onNavigateToOffers: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("iFastFood Entregador") }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = if (isOnline) "🟢 VOCÊ ESTÁ ONLINE" else "🔴 VOCÊ ESTÁ OFFLINE",
                style = MaterialTheme.typography.headlineMedium
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = if (isOnline)
                    "Localização em segundo plano ativada. Você está apto a receber ofertas de corridas."
                else
                    "Fique online para começar a receber chamadas de entrega na sua região.",
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { onToggleShift(!isOnline) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isOnline) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Text(if (isOnline) "Ficar Offline" else "Ficar Online")
            }

            if (isOnline) {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = onNavigateToOffers,
                    modifier = Modifier.fillMaxWidth().height(56.dp)
                ) {
                    Text("Ver Corridas Disponíveis")
                }
            }
        }
    }
}
