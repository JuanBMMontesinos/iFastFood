/**
 * F3 — Serviço de Pagamentos (Stripe como gateway padrão).
 */
import { Injectable, Logger } from '@nestjs/common';
import type { PaymentGateway, PaymentMethod } from '@prisma/client';
import { assertOrderTransition } from '@ifastfood/domain';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../identity/services/audit.service';
import { StripeAdapter } from './stripe.adapter';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stripe: StripeAdapter,
  ) {}

  /** Inicializa registro de pagamento para o pedido. */
  async createPayment(order: {
    id: string;
    code: string;
    totalCents: number;
    paymentMethod: PaymentMethod;
  }): Promise<{ paymentId: string; clientSecret?: string }> {
    if (order.paymentMethod === 'CASH') {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'CASH',
          gateway: 'OFFLINE',
          status: 'PENDING',
          amountCents: order.totalCents,
        },
      });
      return { paymentId: payment.id };
    }

    // Pagamento online (Stripe como padrão)
    const stripeResult = await this.stripe.createPaymentIntent({
      amountCents: order.totalCents,
      orderId: order.id,
      orderCode: order.code,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: order.paymentMethod,
        gateway: 'STRIPE',
        status: 'PENDING',
        amountCents: order.totalCents,
        externalId: stripeResult.externalId,
      },
    });

    return {
      paymentId: payment.id,
      clientSecret: stripeResult.clientSecret,
    };
  }

  /** Processa webhook da Stripe com garantia de idempotência via WebhookEvent. */
  async processStripeWebhook(payload: string | Buffer, signature: string): Promise<void> {
    let event;
    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (err: any) {
      this.logger.error(`Falha na validação do webhook Stripe: ${err.message}`);
      throw ApiError.badRequest('WEBHOOK_INVALIDO', 'Assinatura inválida');
    }

    // Checagem de idempotência
    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        gateway_externalId: {
          gateway: 'STRIPE',
          externalId: event.id,
        },
      },
    });

    if (existing) {
      this.logger.log(`Webhook Stripe ${event.id} já processado anteriormente.`);
      return;
    }

    await this.prisma.webhookEvent.create({
      data: {
        gateway: 'STRIPE',
        externalId: event.id,
        payload: event as any,
        processedAt: new Date(),
      },
    });

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const orderId = intent.metadata?.orderId;
      if (!orderId) return;

      await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (payment && payment.status !== 'PAID') {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              cardBrand: intent.payment_method_details?.card?.brand ?? null,
              cardLast4: intent.payment_method_details?.card?.last4 ?? null,
            },
          });
        }

        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (order && order.status === 'CREATED') {
          assertOrderTransition('CREATED', 'PENDING_ACCEPTANCE');
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'PENDING_ACCEPTANCE' },
          });

          await tx.orderEventOrderState.create({
            data: {
              orderId,
              fromStatus: 'CREATED',
              toStatus: 'PENDING_ACCEPTANCE',
              actorType: 'SYSTEM',
              payload: { reason: 'PAGAMENTO_CONFIRMADO_STRIPE', paymentIntentId: intent.id },
            },
          });
        }
      });

      this.logger.log(`Pagamento confirmado para pedido ${orderId}`);
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as any;
      const orderId = intent.metadata?.orderId;
      if (!orderId) return;

      await this.prisma.payment.updateMany({
        where: { orderId },
        data: { status: 'FAILED' },
      });
      this.logger.warn(`Pagamento falhou para pedido ${orderId}`);
    }
  }

  /** Estorno de pagamento em caso de cancelamento. */
  async refundPayment(orderId: string, reason: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment || payment.status !== 'PAID') {
      return; // Nada a estornar se não foi pago
    }

    if (payment.gateway === 'STRIPE' && payment.externalId) {
      const res = await this.stripe.refund({
        paymentIntentId: payment.externalId,
        amountCents: payment.amountCents,
        reason,
      });

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundedCents: payment.amountCents,
          },
        }),
        this.prisma.refund.create({
          data: {
            paymentId: payment.id,
            amountCents: payment.amountCents,
            reason,
            status: 'COMPLETED',
            externalId: res.refundId,
            completedAt: new Date(),
          },
        }),
      ]);
    }
  }
}
