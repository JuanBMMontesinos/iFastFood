import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CourierService } from './courier.service';
import { CourierController } from './courier.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CourierController],
  providers: [CourierService],
  exports: [CourierService],
})
export class CourierModule {}
