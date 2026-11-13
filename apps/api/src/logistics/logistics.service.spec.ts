import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsService } from './logistics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LogisticsService', () => {
  let service: LogisticsService;
  let prisma: {
    courier: {
      findUnique: jest.Mock;
    };
    courierLocation: {
      create: jest.Mock;
      findFirst: jest.Mock;
    };
    delivery: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    order: {
      update: jest.Mock;
    };
    orderEventOrderState: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      courier: {
        findUnique: jest.fn(),
      },
      courierLocation: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      delivery: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      orderEventOrderState: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
  });

  describe('updateLocation', () => {
    it('registra coordenadas GPS do entregador', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.delivery.findFirst.mockResolvedValue(null);
      prisma.courierLocation.create.mockResolvedValue({
        id: 'loc-1',
        courierId: 'courier-1',
        lat: -23.55052,
        lng: -46.633308,
        onDelivery: false,
        recordedAt: new Date('2026-11-13T10:00:00Z'),
      });

      const res = await service.updateLocation('user-1', {
        lat: -23.55052,
        lng: -46.633308,
      });

      expect(res.ok).toBe(true);
      expect(res.lat).toBe(-23.55052);
      expect(res.onDelivery).toBe(false);
    });
  });

  describe('createDeliveryForOrder', () => {
    it('cria entrega em OFFERED calculando repasse proporcional', async () => {
      prisma.delivery.findUnique.mockResolvedValue(null);
      prisma.delivery.create.mockImplementation(({ data }) => Promise.resolve({ id: 'del-1', ...data }));

      const delivery = await service.createDeliveryForOrder('order-1', 4.0);

      expect(delivery.status).toBe('OFFERED');
      expect(delivery.distanceKm).toBe(4.0);
      expect(delivery.feeCourierCents).toBe(1250); // 650 + 150 * 4 = 1250
    });
  });

  describe('getAvailableOffers', () => {
    it('retorna ofertas disponíveis para entregador ativo', async () => {
      prisma.courier.findUnique.mockResolvedValue({
        id: 'courier-1',
        status: 'ACTIVE',
        shifts: [{ id: 'shift-1' }],
      });

      prisma.delivery.findMany.mockResolvedValue([
        {
          id: 'del-1',
          orderId: 'ord-1',
          distanceKm: 3.0,
          feeCourierCents: 1100,
          offeredAt: new Date('2026-11-13T10:00:00Z'),
          order: {
            code: 'IF-1234',
            merchant: { name: 'Burger Shop', street: 'Rua A', number: '10' },
            deliveryAddress: { street: 'Av B', number: '20' },
          },
        },
      ]);

      const offers = await service.getAvailableOffers('user-1');

      expect(offers).toHaveLength(1);
      expect(offers[0]!.orderCode).toBe('IF-1234');
      expect(offers[0]!.storeName).toBe('Burger Shop');
      expect(offers[0]!.feeCourierCents).toBe(1100);
    });
  });

  describe('executeDeliveryAction', () => {
    it('aceita oferta de corrida (ACCEPT) e move pedido para IN_DELIVERY', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.delivery.findUnique.mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        status: 'OFFERED',
        courierId: null,
        order: { code: 'IF-9999' },
      });
      prisma.delivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'ACCEPTED',
        courierId: 'courier-1',
      });

      const res = await service.executeDeliveryAction('user-1', 'del-1', { action: 'ACCEPT' });

      expect(res.status).toBe('ACCEPTED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { status: 'IN_DELIVERY' },
      });
    });

    it('confirma entrega (DELIVER) com código PIN correto', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.delivery.findUnique.mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        status: 'IN_ROUTE',
        courierId: 'courier-1',
        order: { code: 'IF-5678' },
      });
      prisma.delivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'DELIVERED',
      });

      const res = await service.executeDeliveryAction('user-1', 'del-1', {
        action: 'DELIVER',
        verificationCode: '5678',
      });

      expect(res.status).toBe('DELIVERED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: {
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        },
      });
    });

    it('rejeita confirmação se PIN for incorreto e não houver foto', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.delivery.findUnique.mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        status: 'IN_ROUTE',
        courierId: 'courier-1',
        order: { code: 'IF-5678' },
      });

      await expect(
        service.executeDeliveryAction('user-1', 'del-1', {
          action: 'DELIVER',
          verificationCode: '0000',
        }),
      ).rejects.toThrow('Código de confirmação de entrega inválido');
    });
  });

  describe('getTracking', () => {
    it('retorna rastreamento da entrega com última localização do entregador', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        id: 'del-1',
        orderId: 'ord-1',
        status: 'IN_ROUTE',
        courierId: 'courier-1',
        order: { code: 'IF-1234' },
        courier: {
          id: 'courier-1',
          vehicleType: 'MOTORCYCLE',
          plate: 'XYZ9876',
          ratingAvg: 4.8,
        },
      });

      prisma.courierLocation.findFirst.mockResolvedValue({
        lat: -23.55,
        lng: -46.63,
        recordedAt: new Date('2026-11-13T10:15:00Z'),
        onDelivery: true,
      });

      const tracking = await service.getTracking('ord-1');

      expect(tracking.deliveryId).toBe('del-1');
      expect(tracking.status).toBe('IN_ROUTE');
      expect(tracking.currentLocation?.lat).toBe(-23.55);
      expect(tracking.courier?.vehicleType).toBe('MOTORCYCLE');
    });
  });
});
