package br.com.ifastfood.courier

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import br.com.ifastfood.courier.service.LocationForegroundService
import br.com.ifastfood.courier.ui.screens.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var currentScreen by remember { mutableStateOf("shift") }
            var isOnline by remember { mutableStateOf(false) }
            var activeDeliveryStatus by remember { mutableStateOf<String?>(null) }

            val dummyOffers = listOf(
                DeliveryOfferItem(
                    id = "del-offer-1",
                    orderCode = "IF-8F3K2",
                    storeName = "Pizzaria Bella Napoli",
                    storeAddress = "Av. Paulista, 1000",
                    customerAddress = "Rua Augusta, 450",
                    distanceKm = 2.8,
                    feeBrl = "R$ 10,70"
                )
            )

            when {
                activeDeliveryStatus != null -> {
                    ActiveDeliveryScreen(
                        orderCode = "IF-8F3K2",
                        storeName = "Pizzaria Bella Napoli",
                        customerAddress = "Rua Augusta, 450",
                        currentStatus = activeDeliveryStatus!!,
                        onAction = { action, _ ->
                            when (action) {
                                "PICK_UP" -> activeDeliveryStatus = "PICKED_UP"
                                "IN_ROUTE" -> activeDeliveryStatus = "IN_ROUTE"
                                "DELIVER" -> {
                                    activeDeliveryStatus = null
                                    currentScreen = "shift"
                                }
                                "RETURN_TO_MERCHANT" -> {
                                    activeDeliveryStatus = null
                                    currentScreen = "shift"
                                }
                            }
                        }
                    )
                }
                currentScreen == "offers" -> {
                    OffersScreen(
                        offers = dummyOffers,
                        onAcceptOffer = {
                            activeDeliveryStatus = "ACCEPTED"
                        },
                        onBack = { currentScreen = "shift" }
                    )
                }
                else -> {
                    ShiftScreen(
                        isOnline = isOnline,
                        onToggleShift = { online ->
                            isOnline = online
                            if (online) {
                                LocationForegroundService.start(this)
                            } else {
                                LocationForegroundService.stop(this)
                            }
                        },
                        onNavigateToOffers = { currentScreen = "offers" }
                    )
                }
            }
        }
    }
}
