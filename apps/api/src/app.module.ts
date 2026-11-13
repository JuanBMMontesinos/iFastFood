import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './identity/identity.module';
import { PartnersModule } from './partners/partners.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomerModule } from './customer/customer.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { CourierModule } from './courier/courier.module';
import { LogisticsModule } from './logistics/logistics.module';

/**
 * Monólito modular — os módulos de domínio entram aqui por fase:
 *   F1 IdentityModule
 *   F2 PartnersModule, CatalogModule
 *   F3 CustomerModule, DiscoveryModule, PaymentsModule, OrdersModule
 *   F4 LogisticsModule, CourierModule
 *   F5 FinanceModule, AdminModule
 *   F6 MarketingModule, SupportModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    HealthModule,
    PartnersModule,
    CatalogModule,
    CustomerModule,
    DiscoveryModule,
    PaymentsModule,
    OrdersModule,
    CourierModule,
    LogisticsModule,
  ],
})
export class AppModule {}
