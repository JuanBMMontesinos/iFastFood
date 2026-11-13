import { Injectable } from '@nestjs/common';
import {
  CreateTicketInput,
  TicketView,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Abre um chamado de suporte para cliente, restaurante ou entregador.
   */
  async createTicket(userId: string, input: CreateTicketInput): Promise<TicketView> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        persona: input.persona,
        subject: input.subject,
        orderId: input.orderId,
        status: 'OPEN',
        messages: {
          create: {
            authorUserId: userId,
            authorType: input.persona,
            body: input.message,
          },
        },
      },
    });

    return {
      id: ticket.id,
      persona: ticket.persona,
      subject: ticket.subject,
      status: ticket.status,
      orderId: ticket.orderId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.createdAt.toISOString(),
    };
  }

  /**
   * Lista chamados de suporte do usuário logado.
   */
  async getMyTickets(userId: string): Promise<TicketView[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return tickets.map((t) => ({
      id: t.id,
      persona: t.persona,
      subject: t.subject,
      status: t.status,
      orderId: t.orderId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Consulta detalhes do chamado com histórico de mensagens.
   */
  async getTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { internal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw ApiError.notFound('TICKET_NOT_FOUND', 'Chamado não encontrado.');
    }

    if (ticket.userId !== userId) {
      throw ApiError.forbidden('Você não tem permissão para visualizar este chamado.');
    }

    return ticket;
  }
}
