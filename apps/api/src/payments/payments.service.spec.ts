import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let payments: any[];
  let orders: any[];
  let webhooks: any[];
  let refunds: any[];
  let orderEvents: any[];
  let stripeAdapter: any;

  beforeEach(() => {
    payments = [];
    orders = [
      { id: 'ord-1', code: 'IF-12345', status: 'CREATED', totalCents: 5000 },
    ];
    webhooks = [];
    refunds = [];
    orderEvents = [];

    const mockPrisma: any = {
      payment: {
        create: async ({ data }: any) => {
          const p = { id: `pay-${payments.length + 1}`, ...data };
          payments.push(p);
          return p;
        },
        findUnique: async ({ where }: any) => {
          return payments.find((p) => p.orderId === where.orderId || p.id === where.id) || null;
        },
        update: async ({ where, data }: any) => {
          const p = payments.find((item) => item.id === where.id);
          Object.assign(p, data);
          return p;
        },
        updateMany: async ({ where, data }: any) => {
          payments
            .filter((p) => p.orderId === where.orderId)
            .forEach((p) => Object.assign(p, data));
        },
      },
      order: {
        findUnique: async ({ where }: any) => orders.find((o) => o.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const o = orders.find((item) => item.id === where.id);
          Object.assign(o, data);
          return o;
        },
      },
      orderEventOrderState: {
        create: async ({ data }: any) => {
          orderEvents.push(data);
          return data;
        },
      },
      webhookEvent: {
        findUnique: async ({ where }: any) => {
          return (
            webhooks.find(
              (w) =>
                w.gateway === where.gateway_externalId.gateway &&
                w.externalId === where.gateway_externalId.externalId,
            ) || null
          );
        },
        create: async ({ data }: any) => {
          webhooks.push(data);
          return data;
        },
      },
      refund: {
        create: async ({ data }: any) => {
          refunds.push(data);
          return data;
        },
      },
      $transaction: async (fn: any) => {
        if (Array.isArray(fn)) return Promise.all(fn);
        return fn(mockPrisma);
      },
    };

    const mockAudit: any = {
      log: async () => {},
    };

    stripeAdapter = {
      createPaymentIntent: async () => ({
        clientSecret: 'pi_test_secret_123',
        externalId: 'pi_test_123',
      }),
      refund: async () => ({ refundId: 're_test_123' }),
      constructWebhookEvent: (payload: any) => JSON.parse(payload.toString()),
    };

    service = new PaymentsService(mockPrisma, mockAudit, stripeAdapter);
  });

  it('deve criar pagamento com Stripe e retornar clientSecret', async () => {
    const res = await service.createPayment({
      id: 'ord-1',
      code: 'IF-12345',
      totalCents: 5000,
      paymentMethod: 'CARD_CREDIT',
    });

    expect(res.paymentId).toBeDefined();
    expect(res.clientSecret).toBe('pi_test_secret_123');
    expect(payments.length).toBe(1);
    expect(payments[0]!.gateway).toBe('STRIPE');
    expect(payments[0]!.status).toBe('PENDING');
  });

  it('deve processar webhook payment_intent.succeeded da Stripe com idempotência', async () => {
    // 1. Criar pagamento
    await service.createPayment({
      id: 'ord-1',
      code: 'IF-12345',
      totalCents: 5000,
      paymentMethod: 'CARD_CREDIT',
    });

    const webhookPayload = JSON.stringify({
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: { orderId: 'ord-1' },
          payment_method_details: { card: { brand: 'visa', last4: '4242' } },
        },
      },
    });

    // Processa primeira vez
    await service.processStripeWebhook(webhookPayload, 'sig_dummy');

    expect(payments[0]!.status).toBe('PAID');
    expect(payments[0]!.cardBrand).toBe('visa');
    expect(orders[0]!.status).toBe('PENDING_ACCEPTANCE');
    expect(orderEvents.some((e) => e.toStatus === 'PENDING_ACCEPTANCE')).toBe(true);
    expect(webhooks.length).toBe(1);

    // Processa segunda vez (idempotente - não duplica eventos)
    const initialEventsCount = orderEvents.length;
    await service.processStripeWebhook(webhookPayload, 'sig_dummy');
    expect(orderEvents.length).toBe(initialEventsCount);
  });

  it('deve realizar estorno via Stripe quando solicitado', async () => {
    await service.createPayment({
      id: 'ord-1',
      code: 'IF-12345',
      totalCents: 5000,
      paymentMethod: 'CARD_CREDIT',
    });
    payments[0]!.status = 'PAID';

    await service.refundPayment('ord-1', 'Cancelamento pelo cliente');

    expect(payments[0]!.status).toBe('REFUNDED');
    expect(refunds.length).toBe(1);
    expect(refunds[0]!.status).toBe('COMPLETED');
  });
});
