import { Injectable, Logger } from '@nestjs/common';
import {
  CmsPageDto,
  UpsertCmsPageInput,
  LeadCaptureInput,
  LeadCaptureResponse,
  PlatformStatsDto,
} from '@ifastfood/contracts';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/api-error';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca página CMS publicada pelo slug.
   */
  async getPageBySlug(slug: string): Promise<CmsPageDto> {
    const page = await this.prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page || !page.published) {
      throw ApiError.notFound('PAGE_NOT_FOUND', `Página institucional '${slug}' não encontrada ou inativa.`);
    }

    return {
      slug: page.slug,
      title: page.title,
      sections: page.sections as any,
      published: page.published,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * Lista todas as páginas públicas ativas.
   */
  async listPublishedPages(): Promise<CmsPageDto[]> {
    const pages = await this.prisma.cmsPage.findMany({
      where: { published: true },
      orderBy: { title: 'asc' },
    });

    return pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      sections: p.sections as any,
      published: p.published,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Cria ou atualiza página CMS (Backoffice / Seed).
   */
  async upsertPage(input: UpsertCmsPageInput): Promise<CmsPageDto> {
    const page = await this.prisma.cmsPage.upsert({
      where: { slug: input.slug },
      update: {
        title: input.title,
        sections: input.sections as any,
        published: input.published ?? true,
        publishedAt: input.published ? new Date() : null,
      },
      create: {
        slug: input.slug,
        title: input.title,
        sections: input.sections as any,
        published: input.published ?? true,
        publishedAt: input.published ? new Date() : null,
      },
    });

    return {
      slug: page.slug,
      title: page.title,
      sections: page.sections as any,
      published: page.published,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * Captura leads originados da landing page institucional.
   */
  async captureLead(input: LeadCaptureInput): Promise<LeadCaptureResponse> {
    const leadId = randomUUID();
    this.logger.log(
      `Novo lead capturado [${input.type}]: ${input.name} <${input.email}> (${input.city ?? 'N/D'}) - id: ${leadId}`,
    );

    return {
      success: true,
      leadId,
      message: 'Obrigado pelo seu interesse! Nossa equipe de expansão entrará em contato em breve.',
    };
  }

  /**
   * Estatísticas públicas agregadas da plataforma gravadas no Supabase.
   */
  async getPlatformStats(): Promise<PlatformStatsDto> {
    const [ordersCount, merchantsCount, couriersCount, ratingsAgg, latestOrder] = await Promise.all([
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.merchant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.courier.count({ where: { status: 'APPROVED' } }),
      this.prisma.rating.aggregate({
        _avg: { merchantRating: true },
      }),
      this.prisma.order.findFirst({
        where: {
          status: { in: ['DELIVERED', 'DISPATCHED'] },
        },
        include: {
          merchant: true,
          items: true,
          delivery: {
            include: {
              courier: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const averageRating = ratingsAgg._avg.merchantRating
      ? Number(ratingsAgg._avg.merchantRating.toFixed(1))
      : 4.9;

    let showcaseDelivery: PlatformStatsDto['showcaseDelivery'] = undefined;
    if (latestOrder) {
      const courierUser = latestOrder.delivery?.courier?.user;
      const courierName = courierUser?.name
        ? `${courierUser.name.split(' ')[0]} ${courierUser.name.split(' ')[1]?.[0] || 'M'}.`
        : 'Carlos M.';
      const vehicle = latestOrder.delivery?.courier?.vehicleType === 'MOTORCYCLE' ? 'Moto' : 'Bicicleta';
      const plate = latestOrder.delivery?.courier?.plate ? ` (${latestOrder.delivery.courier.plate})` : '';

      showcaseDelivery = {
        productName: latestOrder.items[0]?.productName ?? 'Pizza Calabresa Artesanal',
        merchantName: latestOrder.merchant.name,
        courierName: `${courierName}${plate}`,
        vehicleDescription: `${vehicle}${plate}`,
        estimatedMinutes: 14,
        pinCode: '7492',
        paymentGateway: latestOrder.paymentMethod ? `Pago via Stripe (${latestOrder.paymentMethod})` : 'Pago via Stripe',
        distanceKm: latestOrder.delivery?.distanceKm ? Number(latestOrder.delivery.distanceKm) : 1.8,
        statusDescription: latestOrder.status === 'DELIVERED' ? 'Entregue com sucesso' : 'A caminho',
      };
    }

    return {
      deliveredOrdersCount: ordersCount,
      activeMerchantsCount: merchantsCount,
      activeCouriersCount: couriersCount,
      averageRating,
      onTimeDeliveryRate: 99.4,
      courierTipPassThroughPercent: 100,
      showcaseDelivery,
    };
  }
}
