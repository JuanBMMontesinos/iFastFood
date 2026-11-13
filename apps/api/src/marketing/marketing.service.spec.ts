import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MarketingService', () => {
  let service: MarketingService;
  let prisma: {
    coupon: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      coupon: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
  });

  describe('validateCoupon', () => {
    it('valida cupom percentual com sucesso e calcula desconto', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'cup-1',
        code: 'PROMO10',
        type: 'PERCENTAGE',
        percentOff: 10,
        minOrderCents: 3000,
        maxDiscountCents: 1000,
        _count: { redemptions: 5 },
        maxRedemptions: 100,
      });

      const res = await service.validateCoupon({
        code: 'promo10',
        orderItemsCents: 5000, // R$ 50,00 -> 10% = R$ 5,00 = 500 cents
      });

      expect(res.valid).toBe(true);
      expect(res.discountCents).toBe(500);
      expect(res.coupon?.code).toBe('PROMO10');
    });

    it('rejeita cupom quando valor mínimo não é atingido', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'cup-1',
        code: 'PROMO50',
        type: 'PERCENTAGE',
        percentOff: 10,
        minOrderCents: 5000,
        _count: { redemptions: 0 },
      });

      const res = await service.validateCoupon({
        code: 'PROMO50',
        orderItemsCents: 3000, // Abaixo do mínimo de 5000
      });

      expect(res.valid).toBe(false);
      expect(res.discountCents).toBe(0);
      expect(res.message).toContain('Pedido mínimo');
    });

    it('rejeita cupom inexistente', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      const res = await service.validateCoupon({
        code: 'INVALIDO',
        orderItemsCents: 5000,
      });

      expect(res.valid).toBe(false);
      expect(res.message).toBe('Cupom não encontrado.');
    });
  });
});
