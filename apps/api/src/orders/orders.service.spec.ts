import { OrdersService } from './orders.service';
import type { PartnerContext } from '../partners/partner.guard';

describe('OrdersService', () => {
  let service: OrdersService;
  let orders: any[];
  let orderItems: any[];
  let orderEvents: any[];
  let customers: any[];
  let addresses: any[];
  let merchants: any[];
  let products: any[];
  let paymentsService: any;
  let customerService: any;

  beforeEach(() => {
    orders = [];
    orderItems = [];
    orderEvents = [];

    customers = [{ id: 'cust-1', userId: 'usr-customer' }];
    addresses = [
      {
        id: 'addr-1',
        customerId: 'cust-1',
        street: 'Rua das Flores',
        number: '123',
        district: 'Centro',
        city: 'SP',
        state: 'SP',
      },
    ];

    merchants = [
      {
        id: 'merch-1',
        name: 'Burger King',
        status: 'ACTIVE',
        contract: {
          plan: 'BASIC',
          commissionBasis: 'ITEMS',
          commissionBps: 1200,
          onlinePaymentFeeBps: 320,
        },
        zones: [
          {
            id: 'z-1',
            baseFeeCents: 600,
            perKmCents: 150,
            minFeeCents: 600,
            maxKm: 10,
          },
        ],
        staff: [{ id: 'staff-1', userId: 'usr-merchant', role: 'OWNER' }],
      },
    ];

    products = [
      {
        id: 'prod-1',
        name: 'Whopper',
        basePriceCents: 3000,
        promotionalPriceCents: null,
        active: true,
        paused: false,
        menuCategory: { merchantId: 'merch-1' },
      },
    ];

    const mockPrisma: any = {
      address: {
        findUnique: async ({ where }: any) => addresses.find((a) => a.id === where.id) || null,
      },
      merchant: {
        findUnique: async ({ where }: any) => merchants.find((m) => m.id === where.id) || null,
      },
      product: {
        findMany: async ({ where }: any) => products.filter((p) => where.id.in.includes(p.id)),
      },
      coupon: {
        findUnique: async () => null,
      },
      order: {
        create: async ({ data }: any) => {
          const o = {
            id: `ord-${orders.length + 1}`,
            createdAt: new Date(),
            placedAt: new Date(),
            ...data,
          };
          orders.push(o);
          if (data.items?.create) {
            orderItems.push(...data.items.create);
          }
          if (data.events?.create) {
            orderEvents.push(data.events.create);
          }
          return o;
        },
        findUnique: async ({ where }: any) => {
          const o = orders.find((item) => item.id === where.id);
          if (!o) return null;
          return {
            ...o,
            customer: customers.find((c) => c.id === o.customerId),
            merchant: merchants.find((m) => m.id === o.merchantId),
            deliveryAddress: addresses.find((a) => a.id === o.deliveryAddressId),
            items: orderItems,
            events: orderEvents,
          };
        },
        update: async ({ where, data }: any) => {
          const o = orders.find((item) => item.id === where.id);
          Object.assign(o, data);
          return o;
        },
        findMany: async ({ where }: any) => {
          return orders
            .filter((o) => (where.merchantId ? o.merchantId === where.merchantId : true))
            .map((o) => ({
              ...o,
              merchant: merchants.find((m) => m.id === o.merchantId),
              deliveryAddress: addresses.find((a) => a.id === o.deliveryAddressId),
              items: orderItems,
              events: orderEvents,
            }));
        },
      },
      orderEventOrderState: {
        create: async ({ data }: any) => {
          orderEvents.push(data);
          return data;
        },
      },
      $transaction: async (fn: any) => {
        if (Array.isArray(fn)) return Promise.all(fn);
        return fn(mockPrisma);
      },
    };

    customerService = {
      getOrCreateCustomer: async () => customers[0],
    };

    paymentsService = {
      createPayment: async () => ({
        paymentId: 'pay-1',
        clientSecret: 'pi_secret_mock',
      }),
      refundPayment: async () => {},
    };

    const mockAudit: any = {
      log: async () => {},
    };

    service = new OrdersService(mockPrisma, mockAudit, customerService, paymentsService);
  });

  it('deve realizar checkout com cálculo server-side e inicializar pagamento Stripe', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };
    const res = await service.checkout(
      'usr-customer',
      {
        merchantId: 'merch-1',
        deliveryAddressId: 'addr-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            options: [],
          },
        ],
        paymentMethod: 'CARD_CREDIT',
      },
      meta,
    );

    expect(res.orderId).toBeDefined();
    expect(res.code).toMatch(/^IF-/);
    // 2 Whoppers = 6000 + frete 600 + taxa 149 = 6749 (R$ 67,49)
    expect(res.itemsTotalCents).toBe(6000);
    expect(res.deliveryFeeCents).toBe(600);
    expect(res.serviceFeeCents).toBe(149);
    expect(res.totalCents).toBe(6749);
    expect(res.stripeClientSecret).toBe('pi_secret_mock');
    expect(orders.length).toBe(1);
    expect(orders[0]!.status).toBe('CREATED');
  });

  it('deve permitir que o parceiro avance o pedido: ACCEPT -> PREPARE -> READY -> DISPATCH -> DELIVER', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };

    // Criar pedido
    const res = await service.checkout(
      'usr-customer',
      {
        merchantId: 'merch-1',
        deliveryAddressId: 'addr-1',
        items: [{ productId: 'prod-1', quantity: 1, options: [] }],
        paymentMethod: 'CASH', // em dinheiro já vai para PENDING_ACCEPTANCE
      },
      meta,
    );

    expect(orders[0]!.status).toBe('PENDING_ACCEPTANCE');

    // 1. Loja Aceita
    const accepted = await service.statusAction(
      res.orderId,
      { action: 'ACCEPT' },
      { type: 'MERCHANT', userId: 'usr-merchant' },
      meta,
    );
    expect(accepted.status).toBe('ACCEPTED');

    // 2. Loja Inicia Preparo
    const prepared = await service.statusAction(
      res.orderId,
      { action: 'PREPARE' },
      { type: 'MERCHANT', userId: 'usr-merchant' },
      meta,
    );
    expect(prepared.status).toBe('IN_PREPARATION');

    // 3. Loja Marca Pronto para Coleta
    const ready = await service.statusAction(
      res.orderId,
      { action: 'READY' },
      { type: 'MERCHANT', userId: 'usr-merchant' },
      meta,
    );
    expect(ready.status).toBe('READY_FOR_PICKUP');

    // 4. Loja Despacha
    const dispatched = await service.statusAction(
      res.orderId,
      { action: 'DISPATCH' },
      { type: 'MERCHANT', userId: 'usr-merchant' },
      meta,
    );
    expect(dispatched.status).toBe('DISPATCHED');

    // 5. Loja Entrega
    const delivered = await service.statusAction(
      res.orderId,
      { action: 'DELIVER' },
      { type: 'MERCHANT', userId: 'usr-merchant' },
      meta,
    );
    expect(delivered.status).toBe('DELIVERED');
  });

  it('deve listar pedidos ativos no Gestor de Pedidos do parceiro', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };
    await service.checkout(
      'usr-customer',
      {
        merchantId: 'merch-1',
        deliveryAddressId: 'addr-1',
        items: [{ productId: 'prod-1', quantity: 1, options: [] }],
        paymentMethod: 'CASH',
      },
      meta,
    );

    const partner: PartnerContext = {
      merchantId: 'merch-1',
      merchantName: 'Burger King',
      merchantStatus: 'ACTIVE',
      staffRole: 'OWNER',
    };

    const activeOrders = await service.getMerchantOrders(partner);
    expect(activeOrders.length).toBe(1);
    expect(activeOrders[0]!.status).toBe('PENDING_ACCEPTANCE');
  });
});
