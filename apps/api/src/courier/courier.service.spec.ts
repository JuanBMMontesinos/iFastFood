import { Test, TestingModule } from '@nestjs/testing';
import { CourierService } from './courier.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CourierService', () => {
  let service: CourierService;
  let prisma: {
    courier: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    courierShift: {
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    courierDocument: {
      create: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      courier: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      courierShift: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      courierDocument: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CourierService>(CourierService);
  });

  describe('getMe', () => {
    it('retorna perfil existente e indica se está online', async () => {
      prisma.courier.findUnique.mockResolvedValue({
        id: 'courier-1',
        userId: 'user-1',
        status: 'ACTIVE',
        vehicleType: 'MOTORCYCLE',
        plate: 'ABC1D23',
        ratingAvg: 4.9,
        ratingCount: 15,
        documents: [],
        shifts: [{ id: 'shift-1' }],
      });

      const profile = await service.getMe('user-1');

      expect(profile.id).toBe('courier-1');
      expect(profile.isOnline).toBe(true);
      expect(profile.activeShiftId).toBe('shift-1');
    });

    it('provisiona entregador novo em ONBOARDING caso não exista', async () => {
      prisma.courier.findUnique.mockResolvedValue(null);
      prisma.courier.create.mockResolvedValue({
        id: 'courier-new',
        userId: 'user-2',
        status: 'ONBOARDING',
        vehicleType: 'MOTORCYCLE',
        plate: null,
        ratingAvg: 0,
        ratingCount: 0,
        documents: [],
        shifts: [],
      });

      const profile = await service.getMe('user-2');

      expect(profile.id).toBe('courier-new');
      expect(profile.status).toBe('ONBOARDING');
      expect(profile.isOnline).toBe(false);
    });
  });

  describe('uploadDocument', () => {
    it('cria documento e move status para PENDING_REVIEW quando CNH e Selfie presentes', async () => {
      prisma.courier.findUnique.mockResolvedValue({
        id: 'courier-1',
        status: 'ONBOARDING',
        documents: [{ type: 'CNH' }],
      });

      prisma.courierDocument.create.mockResolvedValue({
        id: 'doc-selfie',
        type: 'SELFIE',
        fileUrl: 'https://cdn.example.com/selfie.jpg',
        status: 'PENDING',
      });

      await service.uploadDocument('user-1', {
        type: 'SELFIE',
        fileUrl: 'https://cdn.example.com/selfie.jpg',
      });

      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'courier-1' },
        data: { status: 'PENDING_REVIEW' },
      });
    });
  });

  describe('turnos (shifts)', () => {
    it('inicia turno fechando turnos antigos e ativando entregador', async () => {
      prisma.courier.findUnique.mockResolvedValue({
        id: 'courier-1',
        status: 'APPROVED',
      });
      prisma.courierShift.findFirst.mockResolvedValue(null);
      prisma.courierShift.create.mockResolvedValue({
        id: 'shift-new',
        courierId: 'courier-1',
      });

      const shift = await service.startShift('user-1');

      expect(prisma.courierShift.updateMany).toHaveBeenCalled();
      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'courier-1' },
        data: { status: 'ACTIVE' },
      });
      expect(shift.id).toBe('shift-new');
    });

    it('encerra turno ativo colocando entregador em APPROVED (offline)', async () => {
      prisma.courier.findUnique.mockResolvedValue({
        id: 'courier-1',
        status: 'ACTIVE',
      });

      const res = await service.endShift('user-1');

      expect(prisma.courierShift.updateMany).toHaveBeenCalledWith({
        where: { courierId: 'courier-1', endedAt: null },
        data: { endedAt: expect.any(Date) },
      });
      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'courier-1' },
        data: { status: 'APPROVED' },
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('reviewCourier', () => {
    it('aprova entregador e todos os documentos pendentes', async () => {
      prisma.courier.findUnique.mockResolvedValue({ id: 'courier-1' });
      prisma.courier.update.mockResolvedValue({ id: 'courier-1', status: 'APPROVED' });

      await service.reviewCourier('admin-1', 'courier-1', { decision: 'APPROVE' });

      expect(prisma.courier.update).toHaveBeenCalledWith({
        where: { id: 'courier-1' },
        data: { status: 'APPROVED' },
      });
      expect(prisma.courierDocument.updateMany).toHaveBeenCalledWith({
        where: { courierId: 'courier-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'APPROVED', reviewedByUserId: 'admin-1' }),
      });
    });
  });
});
