import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  CourierLocationUpdateInput,
  DeliveryActionInput,
  courierLocationUpdateInputSchema,
  deliveryActionInputSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { LogisticsService } from './logistics.service';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('couriers/me/location')
  @HttpCode(200)
  updateLocation(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(courierLocationUpdateInputSchema)) body: CourierLocationUpdateInput,
  ) {
    return this.logisticsService.updateLocation(principal.userId, body);
  }

  @Get('couriers/me/offers')
  getOffers(@CurrentUser() principal: Principal) {
    return this.logisticsService.getAvailableOffers(principal.userId);
  }

  @Post('couriers/me/deliveries/:id/action')
  @HttpCode(200)
  executeAction(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) deliveryId: string,
    @Body(new ZodValidationPipe(deliveryActionInputSchema)) body: DeliveryActionInput,
  ) {
    return this.logisticsService.executeDeliveryAction(principal.userId, deliveryId, body);
  }

  @Get('orders/:orderId/tracking')
  getTracking(@Param('orderId', new ZodValidationPipe(uuidSchema)) orderId: string) {
    return this.logisticsService.getTracking(orderId);
  }
}
