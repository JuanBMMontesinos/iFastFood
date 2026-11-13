import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './identity/identity.module';
import { PartnersModule } from './partners/partners.module';
import { CatalogModule } from './catalog/catalog.module';

/**
 * Monólito modular — os módulos de domínio entram aqui por fase:
 *   F1 IdentityModule · F2 PartnersModule/CatalogModule · F3 OrderModule/PaymentModule/CustomerModule
 *   F4 LogisticsModule/CourierModule · F5 FinanceModule/AdminModule · F6 MarketingModule/SupportModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    HealthModule,
    PartnersModule,
    CatalogModule,
  ],
})
export class AppModule {}
