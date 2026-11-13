import { Injectable } from '@nestjs/common';
import {
  CreateRatingInput,
  RatingView,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Avalia a loja e/ou o entregador após conclusão do pedido.
   */
  async createRating(userId: string, input: CreateRatingInput): Promise<RatingView> {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        customer: true,
        delivery: true,
        merchant: true,
        rating: true,
      },
    });

    if (!order) {
      throw ApiError.notFound('ORDER_NOT_FOUND', 'Pedido não encontrado.');
    }

    if (order.status !== 'DELIVERED') {
      throw ApiError.badRequest('PEDIDO_NAO_ENTREGUE', 'Apenas pedidos entregues podem ser avaliados.');
    }

    if (order.rating) {
      throw ApiError.conflict('JA_AVALIADO', 'Este pedido já foi avaliado anteriormente.');
    }

    const rating = await this.prisma.rating.create({
      data: {
        orderId: input.orderId,
        merchantRating: input.merchantRating,
        courierRating: input.courierRating,
        comment: input.comment,
      },
    });

    // Atualiza média acumulada da loja
    if (input.merchantRating) {
      const currentAvg = Number(order.merchant.ratingAvg);
      const currentCount = order.merchant.ratingCount;
      const newCount = currentCount + 1;
      const newAvg = (currentAvg * currentCount + input.merchantRating) / newCount;

      await this.prisma.merchant.update({
        where: { id: order.merchantId },
        data: {
          ratingAvg: newAvg,
          ratingCount: newCount,
        },
      });
    }

    // Atualiza média acumulada do entregador
    if (input.courierRating && order.delivery?.courierId) {
      const courier = await this.prisma.courier.findUnique({
        where: { id: order.delivery.courierId },
      });

      if (courier) {
        const currentAvg = Number(courier.ratingAvg);
        const currentCount = courier.ratingCount;
        const newCount = currentCount + 1;
        const newAvg = (currentAvg * currentCount + input.courierRating) / newCount;

        await this.prisma.courier.update({
          where: { id: courier.id },
          data: {
            ratingAvg: newAvg,
            ratingCount: newCount,
          },
        });
      }
    }

    return {
      id: rating.id,
      orderId: rating.orderId,
      merchantRating: rating.merchantRating,
      courierRating: rating.courierRating,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    };
  }

  /**
   * Consulta avaliação de um pedido.
   */
  async getOrderRating(orderId: string): Promise<RatingView | null> {
    const rating = await this.prisma.rating.findUnique({
      where: { orderId },
    });

    if (!rating) return null;

    return {
      id: rating.id,
      orderId: rating.orderId,
      merchantRating: rating.merchantRating,
      courierRating: rating.courierRating,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
    };
  }
}
