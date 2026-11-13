import { Injectable } from '@nestjs/common';
import {
  CouponValidationResult,
  ValidateCouponInput,
} from '@ifastfood/contracts';
import { evaluateCoupon } from '@ifastfood/domain';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida aplicação de cupom de desconto em um pedido via domain rule evaluateCoupon.
   */
  async validateCoupon(input: ValidateCouponInput): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase().trim() },
      include: {
        _count: { select: { redemptions: true } },
      },
    });

    if (!coupon) {
      return { valid: false, discountCents: 0, message: 'Cupom não encontrado.' };
    }

    const evaluation = evaluateCoupon({
      coupon: {
        code: coupon.code,
        type: coupon.type,
        percentOff: coupon.percentOff ?? undefined,
        amountOffCents: coupon.amountOffCents ?? undefined,
        maxDiscountCents: coupon.maxDiscountCents ?? undefined,
        minOrderCents: coupon.minOrderCents ?? undefined,
        validFromIso: coupon.validFrom?.toISOString(),
        validUntilIso: coupon.validUntil?.toISOString(),
        maxRedemptions: coupon.maxRedemptions ?? undefined,
      },
      orderItemsCents: input.orderItemsCents,
      deliveryFeeCents: 0,
      isFirstOrder: false,
      totalRedemptions: coupon._count.redemptions,
      customerRedemptions: 0,
      nowIso: new Date().toISOString(),
    });

    if (!evaluation.valid) {
      const messages: Record<string, string> = {
        NOT_STARTED: 'Cupom ainda não está ativo.',
        EXPIRED: 'Cupom expirado.',
        MIN_ORDER_NOT_REACHED: `Pedido mínimo para este cupom é de R$ ${((coupon.minOrderCents ?? 0) / 100).toFixed(2)}.`,
        USAGE_LIMIT_REACHED: 'Limite de usos deste cupom esgotado.',
        FIRST_ORDER_ONLY: 'Cupom válido apenas para a primeira compra.',
        CATEGORY_NOT_ELIGIBLE: 'Categoria de pedido não elegível para este cupom.',
      };
      return {
        valid: false,
        discountCents: 0,
        message: messages[evaluation.reason] ?? 'Cupom inválido.',
      };
    }

    return {
      valid: true,
      discountCents: evaluation.discountCents,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
      },
    };
  }
}
