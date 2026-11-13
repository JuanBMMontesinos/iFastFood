import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      order: {
        aggregate: jest.fn(),
      } as any,
      courier: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      merchant: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      merchantDocument: {
        updateMany: jest.fn(),
      } as any,
      courierDocument: {
        updateMany: jest.fn(),
      } as any,
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };
    service = new AdminService(prisma as PrismaService);
  });

  it('deve retornar métricas agregadas do dashboard corretamente', async () => {
    (prisma.order!.aggregate as any).mockResolvedValue({
      _sum: { totalCents: 10000, commissionCents: 1200, serviceFeeCents: 200 },
      _count: { id: 5 },
    });
    (prisma.courier!.count as any)
      .mockResolvedValueOnce(3) // active couriers
      .mockResolvedValueOnce(2); // pending couriers
    (prisma.merchant!.count as any)
      .mockResolvedValueOnce(4) // active merchants
      .mockResolvedValueOnce(1); // pending merchants

    const metrics = await service.getDashboardMetrics();
    expect(metrics.gmvCents).toBe(10000);
    expect(metrics.netRevenueCents).toBe(1400);
    expect(metrics.deliveredOrdersCount).toBe(5);
    expect(metrics.activeCouriersCount).toBe(3);
    expect(metrics.activeMerchantsCount).toBe(4);
    expect(metrics.pendingKycCount).toBe(3);
  });

  it('deve retornar fila de KYC com lojistas e entregadores pendentes', async () => {
    (prisma.merchant!.findMany as any).mockResolvedValue([
      {
        id: 'm-1',
        name: 'Sushi House',
        documentEncrypted: '12345678000199',
        createdAt: new Date('2026-11-13T10:00:00Z'),
        status: 'PENDING_REVIEW',
        documents: [{ type: 'CNPJ_CARD' }],
      },
    ]);
    (prisma.courier!.findMany as any).mockResolvedValue([
      {
        id: 'c-1',
        user: { name: 'Lucas Rocha' },
        plate: 'SPX-9F31',
        vehicleType: 'MOTORCYCLE',
        createdAt: new Date('2026-11-13T11:00:00Z'),
        status: 'PENDING_REVIEW',
        documents: [{ type: 'CNH' }],
      },
    ]);

    const queue = await service.getKycQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0]!.type).toBe('MERCHANT');
    expect(queue[0]!.name).toBe('Sushi House');
    expect(queue[1]!.type).toBe('COURIER');
    expect(queue[1]!.name).toBe('Lucas Rocha');
  });

  it('deve homologar restaurante e seus documentos na fila de KYC', async () => {
    (prisma.merchant!.findUnique as any).mockResolvedValue({
      id: 'm-1',
      name: 'Sushi House',
    });
    (prisma.merchant!.update as any).mockResolvedValue({ id: 'm-1', status: 'ACTIVE' });

    const result = await service.reviewMerchant('m-1', { decision: 'APPROVE' });
    expect(result.success).toBe(true);
    expect(result.status).toBe('ACTIVE');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
