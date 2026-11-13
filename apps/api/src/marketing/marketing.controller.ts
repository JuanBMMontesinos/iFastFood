import { Body, Controller, Post } from '@nestjs/common';
import {
  ValidateCouponInput,
  validateCouponInputSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { MarketingService } from './marketing.service';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('coupons/validate')
  validateCoupon(
    @Body(new ZodValidationPipe(validateCouponInputSchema)) body: ValidateCouponInput,
  ) {
    return this.marketingService.validateCoupon(body);
  }
}
