import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: {
    supportTicket: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('createTicket', () => {
    it('cria chamado de suporte com mensagem inicial', async () => {
      prisma.supportTicket.create.mockResolvedValue({
        id: 'tick-1',
        persona: 'CUSTOMER',
        subject: 'Dúvida com entrega',
        status: 'OPEN',
        orderId: 'ord-1',
        createdAt: new Date('2026-11-13T12:00:00Z'),
      });

      const res = await service.createTicket('user-1', {
        persona: 'CUSTOMER',
        subject: 'Dúvida com entrega',
        orderId: '00000000-0000-0000-0000-000000000001',
        message: 'Gostaria de saber a previsão de entrega.',
      });

      expect(res.id).toBe('tick-1');
      expect(res.persona).toBe('CUSTOMER');
      expect(res.subject).toBe('Dúvida com entrega');
      expect(prisma.supportTicket.create).toHaveBeenCalled();
    });
  });

  describe('getMyTickets', () => {
    it('lista chamados do usuário', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([
        {
          id: 'tick-1',
          persona: 'CUSTOMER',
          subject: 'Problema no pagamento',
          status: 'RESOLVED',
          orderId: null,
          createdAt: new Date('2026-11-13T10:00:00Z'),
        },
      ]);

      const tickets = await service.getMyTickets('user-1');

      expect(tickets).toHaveLength(1);
      expect(tickets[0]!.id).toBe('tick-1');
      expect(tickets[0]!.status).toBe('RESOLVED');
    });
  });
});
