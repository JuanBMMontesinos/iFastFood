/**
 * F3 — Adaptador de Pagamento Stripe (Gateway Padrão).
 * Escopo PCI-DSS SAQ-A: tokens/PaymentIntents processados na Stripe.
 */
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

export interface CreatePaymentIntentResult {
  clientSecret: string;
  externalId: string;
}

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe?: Stripe;
  private readonly webhookSecret?: string;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-02-24.acacia' as any,
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY ausente: modo MOCK ativado para pagamentos em desenvolvimento.',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.stripe);
  }

  async createPaymentIntent(params: {
    amountCents: number;
    orderId: string;
    orderCode: string;
  }): Promise<CreatePaymentIntentResult> {
    if (!this.stripe) {
      // Mock para desenvolvimento sem chave
      const fakeId = `pi_mock_${Date.now()}`;
      return {
        clientSecret: `${fakeId}_secret_mock`,
        externalId: fakeId,
      };
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: 'brl',
      metadata: {
        orderId: params.orderId,
        orderCode: params.orderCode,
      },
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      throw new Error('Stripe PaymentIntent criado sem client_secret');
    }

    return {
      clientSecret: intent.client_secret,
      externalId: intent.id,
    };
  }

  async refund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<{ refundId: string }> {
    if (!this.stripe) {
      return { refundId: `re_mock_${Date.now()}` };
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amountCents,
      metadata: { reason: params.reason ?? 'order_cancelled' },
    });

    return { refundId: refund.id };
  }

  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe || !this.webhookSecret) {
      // Mock webhook event parser se não configurado
      return JSON.parse(payload.toString()) as Stripe.Event;
    }

    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
