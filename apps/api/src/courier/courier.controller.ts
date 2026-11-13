import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  CourierOnboardingInput,
  CourierDocumentUploadInput,
  CourierReviewInput,
  courierOnboardingInputSchema,
  courierDocumentUploadInputSchema,
  courierReviewInputSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser, RequirePermissions } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { CourierService } from './courier.service';

@Controller('couriers')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Get('me')
  getMe(@CurrentUser() principal: Principal) {
    return this.courierService.getMe(principal.userId);
  }

  @Post('onboard')
  onboard(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(courierOnboardingInputSchema)) body: CourierOnboardingInput,
  ) {
    return this.courierService.onboard(principal.userId, body);
  }

  @Post('me/documents')
  uploadDocument(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(courierDocumentUploadInputSchema)) body: CourierDocumentUploadInput,
  ) {
    return this.courierService.uploadDocument(principal.userId, body);
  }

  @Post('me/shift/start')
  @HttpCode(200)
  startShift(@CurrentUser() principal: Principal) {
    return this.courierService.startShift(principal.userId);
  }

  @Post('me/shift/end')
  @HttpCode(200)
  endShift(@CurrentUser() principal: Principal) {
    return this.courierService.endShift(principal.userId);
  }

  @Patch('admin/:id/review')
  @RequirePermissions('admin.access')
  reviewCourier(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) courierId: string,
    @Body(new ZodValidationPipe(courierReviewInputSchema)) body: CourierReviewInput,
  ) {
    return this.courierService.reviewCourier(principal.userId, courierId, body);
  }
}
