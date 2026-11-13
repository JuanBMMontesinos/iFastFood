import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { StripeAdapter } from './stripe.adapter';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [PaymentsController],
  providers: [StripeAdapter, PaymentsService],
  exports: [PaymentsService, StripeAdapter],
})
export class PaymentsModule {}
