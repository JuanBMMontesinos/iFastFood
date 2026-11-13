import { Test, TestingModule } from '@nestjs/testing';
import { RatingService } from './rating.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RatingService', () => {
  let service: RatingService;
  let prisma: {
    order: {
      findUnique: jest.Mock;
    };
    rating: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    merchant: {
      update: jest.Mock;
    };
    courier: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      rating: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      merchant: {
        update: jest.fn(),
      },
      courier: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
  });

  describe('createRating', () => {
    it('avalia loja e entregador com sucesso recalculando médias', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: 'DELIVERED',
        merchantId: 'm-1',
        rating: null,
        merchant: {
          ratingAvg: 4.0,
          ratingCount: 1,
        },
        delivery: {
          courierId: 'c-1',
        },
      });

      prisma.courier.findUnique.mockResolvedValue({
        id: 'c-1',
        ratingAvg: 5.0,
        ratingCount: 1,
      });

      prisma.rating.create.mockResolvedValue({
        id: 'rat-1',
        orderId: 'ord-1',
        merchantRating: 5,
        courierRating: 5,
        comment: 'Comida excelente e entrega rápida!',
        createdAt: new Date('2026-11-13T12:00:00Z'),
      });

      const res = await service.createRating('user-1', {
        orderId: 'ord-1',
        merchantRating: 5,
        courierRating: 5,
        comment: 'Comida excelente e entrega rápida!',
      });

      expect(res.id).toBe('rat-1');
      expect(res.merchantRating).toBe(5);
      expect(prisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: {
          ratingAvg: 4.5, // (4.0 * 1 + 5) / 2 = 4.5
          ratingCount: 2,
        },
      });
      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: {
          ratingAvg: 5.0, // (5.0 * 1 + 5) / 2 = 5.0
          ratingCount: 2,
        },
      });
    });

    it('rejeita avaliação de pedido não entregue', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: 'PLACED',
      });

      await expect(
        service.createRating('user-1', {
          orderId: 'ord-1',
          merchantRating: 5,
        }),
      ).rejects.toThrow('Apenas pedidos entregues podem ser avaliados.');
    });
  });
});
