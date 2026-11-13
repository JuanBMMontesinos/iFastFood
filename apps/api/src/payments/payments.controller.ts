/**
 * F3 — Webhook da Stripe (público).
 */
import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../identity/guards/decorators';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhooks/stripe')
  @Public()
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = (request as any).rawBody ?? JSON.stringify(request.body);
    await this.payments.processStripeWebhook(rawBody, signature || '');
    return { received: true };
  }
}
