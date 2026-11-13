import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateRatingInput,
  createRatingInputSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { RatingService } from './rating.service';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  createRating(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(createRatingInputSchema)) body: CreateRatingInput,
  ) {
    return this.ratingService.createRating(principal.userId, body);
  }

  @Get('orders/:orderId')
  getOrderRating(@Param('orderId', new ZodValidationPipe(uuidSchema)) orderId: string) {
    return this.ratingService.getOrderRating(orderId);
  }
}
