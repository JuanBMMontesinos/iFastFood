import { Injectable, Logger } from '@nestjs/common';
import {
  CourierLocationUpdateInput,
  DeliveryActionInput,
  DeliveryOfferDto,
  DeliveryTrackingDto,
} from '@ifastfood/contracts';
import {
  assertDeliveryTransition,
  calculateCourierFee,
  verifyDeliveryPin,
} from '@ifastfood/domain';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atualiza a localização GPS do entregador em tempo real.
   */
  async updateLocation(userId: string, input: CourierLocationUpdateInput) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    // Verifica se está com corrida ativa para marcar flag onDelivery
    const activeDelivery = await this.prisma.delivery.findFirst({
      where: {
        courierId: courier.id,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_ROUTE'] },
      },
    });

    const location = await this.prisma.courierLocation.create({
      data: {
        courierId: courier.id,
        lat: input.lat,
        lng: input.lng,
        onDelivery: !!activeDelivery,
      },
    });

    return {
      ok: true,
      lat: Number(location.lat),
      lng: Number(location.lng),
      recordedAt: location.recordedAt.toISOString(),
      onDelivery: location.onDelivery,
    };
  }

  /**
   * Cria registro de entrega (Delivery) para um pedido no Plano Entrega.
   */
  async createDeliveryForOrder(orderId: string, distanceKm = 3.5) {
    const existing = await this.prisma.delivery.findUnique({
      where: { orderId },
    });

    if (existing) {
      return existing;
    }

    const feeCourierCents = calculateCourierFee(distanceKm);

    return this.prisma.delivery.create({
      data: {
        orderId,
        status: 'OFFERED',
        distanceKm,
        feeCourierCents,
        offeredAt: new Date(),
      },
    });
  }

  /**
   * Lista ofertas de corridas disponíveis para o entregador ativo.
   */
  async getAvailableOffers(userId: string): Promise<DeliveryOfferDto[]> {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
      include: {
        shifts: { where: { endedAt: null }, take: 1 },
      },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    if (!courier.shifts?.length && courier.status !== 'ACTIVE') {
      return []; // Entregador offline não recebe ofertas
    }

    // Ofertas em aberto dos últimos 30 minutos
    const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: 'OFFERED',
        courierId: null,
        offeredAt: { gte: recentThreshold },
      },
      include: {
        order: {
          include: {
            merchant: true,
            deliveryAddress: true,
          },
        },
      },
      orderBy: { offeredAt: 'desc' },
      take: 10,
    });

    return deliveries.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      orderCode: d.order.code,
      storeName: d.order.merchant.name,
      storeAddress: `${d.order.merchant.street ?? ''}, ${d.order.merchant.number ?? ''}`.trim(),
      customerAddress: d.order.deliveryAddress
        ? `${d.order.deliveryAddress.street}, ${d.order.deliveryAddress.number}`
        : 'Endereço informado no app',
      distanceKm: Number(d.distanceKm ?? 3.5),
      feeCourierCents: d.feeCourierCents ?? calculateCourierFee(3.5),
      offeredAt: d.offeredAt.toISOString(),
    }));
  }

  /**
   * Executa uma ação de transição na entrega (ACEITAR, COLETAR, EM ROTA, ENTREGAR, DEVOLVER).
   */
  async executeDeliveryAction(userId: string, deliveryId: string, input: DeliveryActionInput) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!delivery) {
      throw ApiError.notFound('DELIVERY_NOT_FOUND', 'Entrega não encontrada.');
    }

    if (input.action === 'ACCEPT') {
      if (delivery.status !== 'OFFERED') {
        throw ApiError.conflict('CORRIDA_JA_ACEITA', 'Esta corrida já foi aceita ou cancelada.');
      }

      assertDeliveryTransition(delivery.status, 'ACCEPTED');

      const updated = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          courierId: courier.id,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // Atualiza o pedido para IN_DELIVERY
      await this.prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'IN_DELIVERY' },
      });

      await this.prisma.orderEventOrderState.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: 'DISPATCHED',
          toStatus: 'IN_DELIVERY',
          actorType: 'COURIER',
          actorUserId: userId,
          payload: { reason: `Corrida aceita pelo entregador ${courier.id}` },
        },
      });

      return updated;
    }

    // Ações posteriores exigem que a corrida pertença a este entregador
    if (delivery.courierId !== courier.id) {
      throw ApiError.forbidden('Esta corrida não pertence a este entregador.');
    }

    if (input.action === 'PICK_UP') {
      assertDeliveryTransition(delivery.status, 'PICKED_UP');

      const updated = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PICKED_UP',
          pickedUpAt: new Date(),
        },
      });

      await this.prisma.orderEventOrderState.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: 'IN_DELIVERY',
          toStatus: 'IN_DELIVERY',
          actorType: 'COURIER',
          actorUserId: userId,
          payload: { reason: 'Pedido coletado no restaurante pelo entregador' },
        },
      });

      return updated;
    }

    if (input.action === 'IN_ROUTE') {
      assertDeliveryTransition(delivery.status, 'IN_ROUTE');

      const updated = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'IN_ROUTE',
          inRouteAt: new Date(),
        },
      });

      return updated;
    }

    if (input.action === 'DELIVER') {
      assertDeliveryTransition(delivery.status, 'DELIVERED');

      // Validação de segurança do PIN de entrega ou comprovante por foto
      if (input.verificationCode) {
        // PIN padrão esperado: últimos 4 dígitos do código do pedido ou telefone do cliente
        const expectedPin = delivery.order.code.replace(/\D/g, '').slice(-4) || '1234';
        const isValid = verifyDeliveryPin(input.verificationCode, expectedPin);
        if (!isValid && !input.proofUrl) {
          throw ApiError.badRequest('PIN_INVALIDO', 'Código de confirmação de entrega inválido.');
        }
      }

      const updated = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          proofUrl: input.proofUrl,
          notes: input.notes,
        },
      });

      // Atualiza o pedido como entregue
      await this.prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      await this.prisma.orderEventOrderState.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: 'IN_DELIVERY',
          toStatus: 'DELIVERED',
          actorType: 'COURIER',
          actorUserId: userId,
          payload: { reason: 'Pedido entregue com sucesso ao cliente' },
        },
      });

      return updated;
    }

    if (input.action === 'RETURN_TO_MERCHANT') {
      assertDeliveryTransition(delivery.status, 'RETURNED_TO_MERCHANT');

      const updated = await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'RETURNED_TO_MERCHANT',
          returnedAt: new Date(),
          notes: input.notes ?? 'Cliente não localizado / Recusado',
        },
      });

      await this.prisma.orderEventOrderState.create({
        data: {
          orderId: delivery.orderId,
          fromStatus: 'IN_DELIVERY',
          toStatus: 'CANCELED',
          actorType: 'COURIER',
          actorUserId: userId,
          payload: { reason: `Retornado ao lojista: ${input.notes ?? 'Sem sucesso na entrega'}` },
        },
      });

      return updated;
    }

    throw ApiError.badRequest('ACAO_INVALIDA', `Ação desconhecida: ${input.action}`);
  }

  /**
   * Rastreamento da entrega em tempo real (para o PWA do cliente e Gestor de Pedidos).
   */
  async getTracking(orderId: string): Promise<DeliveryTrackingDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        order: true,
        courier: true,
      },
    });

    if (!delivery) {
      throw ApiError.notFound('DELIVERY_NOT_FOUND', 'Entrega não encontrada para este pedido.');
    }

    let currentLocation = null;
    if (delivery.courierId) {
      const lastLoc = await this.prisma.courierLocation.findFirst({
        where: { courierId: delivery.courierId },
        orderBy: { recordedAt: 'desc' },
      });

      if (lastLoc) {
        currentLocation = {
          lat: Number(lastLoc.lat),
          lng: Number(lastLoc.lng),
          recordedAt: lastLoc.recordedAt.toISOString(),
          onDelivery: lastLoc.onDelivery,
        };
      }
    }

    return {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      orderCode: delivery.order.code,
      status: delivery.status,
      courier: delivery.courier
        ? {
            id: delivery.courier.id,
            vehicleType: delivery.courier.vehicleType,
            plate: delivery.courier.plate,
            ratingAvg: Number(delivery.courier.ratingAvg),
          }
        : null,
      currentLocation,
      pickedUpAt: delivery.pickedUpAt ? delivery.pickedUpAt.toISOString() : null,
      deliveredAt: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
    };
  }
}
