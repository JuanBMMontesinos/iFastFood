import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { IdentityModule } from './identity/identity.module';

/**
 * Monólito modular — os módulos de domínio entram aqui por fase:
 *   F1 IdentityModule · F2 MerchantModule/CatalogModule · F3 OrderModule/PaymentModule
 *   F4 LogisticsModule · F5 FinanceModule/AdminModule · F6 MarketingModule/SupportModule
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, IdentityModule, HealthModule],
})
export class AppModule {}
