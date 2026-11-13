import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: {
    ledgerAccount: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    ledgerEntry: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    order: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    merchant: {
      findUnique: jest.Mock;
    };
    payout: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    courier: {
      findUnique: jest.Mock;
    };
    delivery: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      ledgerAccount: {
        upsert: jest.fn().mockResolvedValue({ id: 'acc-1' }),
        findMany: jest.fn().mockResolvedValue([
          { code: '1001', id: 'acc-1001' },
          { code: '1002', id: 'acc-1002' },
          { code: '2001', id: 'acc-2001' },
          { code: '4001', id: 'acc-4001' },
          { code: '4002', id: 'acc-4002' },
        ]),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      merchant: {
        findUnique: jest.fn(),
      },
      payout: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      courier: {
        findUnique: jest.fn(),
      },
      delivery: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  describe('recordOrderPayment', () => {
    it('escritura lançamentos no Ledger balanceados ao pagar pedido', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        totalCents: 5200,
        itemsTotalCents: 5000,
        deliveryFeeCents: 0,
        commissionCents: 600,
        processingFeeCents: 160,
        serviceFeeCents: 200,
        delivery: null,
      });

      await service.recordOrderPayment('ord-1');

      expect(prisma.ledgerEntry.create).toHaveBeenCalled();
    });
  });

  describe('generateMerchantPayout', () => {
    it('calcula repasse com desconto de comissão e gera Payout e Ledger', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'merch-1',
        contract: {
          monthlyFeeCents: 11000,
          feeFreeThresholdCents: 180000,
        },
      });

      prisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          code: 'IF-1234',
          itemsTotalCents: 10000,
          deliveryFeeCents: 0,
          commissionCents: 1200,
          processingFeeCents: 320,
        },
      ]);

      prisma.payout.create.mockResolvedValue({
        id: 'payout-1',
        merchantId: 'merch-1',
        periodStart: new Date('2026-11-01'),
        periodEnd: new Date('2026-11-07'),
        grossCents: 10000,
        commissionCents: 1200,
        processingFeeCents: 320,
        monthlyFeeCents: 0, // < 180000 -> isento
        netCents: 8480,
        status: 'PENDING',
        items: [
          {
            id: 'item-1',
            orderId: 'ord-1',
            orderItemsCents: 10000,
            orderDeliveryCents: 0,
            commissionCents: 1200,
            processingFeeCents: 320,
            netCents: 8480,
          },
        ],
      });

      const res = await service.generateMerchantPayout({
        merchantId: 'merch-1',
        periodStart: '2026-11-01T00:00:00Z',
        periodEnd: '2026-11-07T23:59:59Z',
      });

      expect(res.id).toBe('payout-1');
      expect(res.grossCents).toBe(10000);
      expect(res.netCents).toBe(8480);
      expect(prisma.payout.create).toHaveBeenCalled();
      expect(prisma.ledgerEntry.create).toHaveBeenCalled();
    });
  });

  describe('getCourierEarnings', () => {
    it('retorna extrato de ganhos do entregador', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.delivery.findMany.mockResolvedValue([
        {
          id: 'del-1',
          feeCourierCents: 950,
          distanceKm: 2.5,
          deliveredAt: new Date('2026-11-13T10:00:00Z'),
          order: { code: 'IF-9999' },
        },
      ]);

      const earnings = await service.getCourierEarnings('user-courier');

      expect(earnings.courierId).toBe('courier-1');
      expect(earnings.totalDeliveries).toBe(1);
      expect(earnings.totalEarningsCents).toBe(950);
      expect(earnings.recentDeliveries[0]!.orderCode).toBe('IF-9999');
    });
  });
});
