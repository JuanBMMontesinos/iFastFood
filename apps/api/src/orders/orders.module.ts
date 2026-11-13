import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { CustomerModule } from '../customer/customer.module';
import { PaymentsModule } from '../payments/payments.module';
import { PartnersModule } from '../partners/partners.module';
import { OrdersController, PartnerOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    PrismaModule,
    IdentityModule,
    CustomerModule,
    PaymentsModule,
    PartnersModule,
  ],
  controllers: [OrdersController, PartnerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
