/**
 * F3 — Descoberta (Discovery): Feed geolocalizado de lojas abertas e detalhes públicos.
 */
import { Injectable } from '@nestjs/common';
import {
  calculateDeliveryFee,
  haversineKm,
  isOpenNow,
  type BusinessWindow,
} from '@ifastfood/domain';
import type { DiscoveryFeedQuery, DiscoveryMerchantCard } from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Feed de parceiros: retorna lojas ACTIVE ordenadas por proximidade que
   * atendem às coordenadas passadas (dentro de suas DeliveryZones).
   */
  async getFeed(query: DiscoveryFeedQuery): Promise<DiscoveryMerchantCard[]> {
    const where: any = {
      status: 'ACTIVE',
      lat: { not: null },
      lng: { not: null },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.query) {
      where.name = { contains: query.query, mode: 'insensitive' };
    }

    const merchants = await this.prisma.merchant.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        hours: true,
        zones: true,
      },
    });

    const nowSãoPaulo = this.getCurrentTimeInSaoPaulo();
    const customerLoc = { lat: query.lat, lng: query.lng };
    const cards: DiscoveryMerchantCard[] = [];

    for (const m of merchants) {
      if (m.lat === null || m.lng === null) continue;
      const merchantLoc = { lat: Number(m.lat), lng: Number(m.lng) };
      const distanceKm = haversineKm(merchantLoc, customerLoc);

      // Encontra a melhor zona de entrega que atenda a distância
      const matchingZone = m.zones.find((z) => {
        if (z.type === 'RADIUS') {
          return z.maxKm === null || distanceKm <= z.maxKm;
        }
        return false;
      });

      if (!matchingZone) {
        // Fora do raio de entrega
        continue;
      }

      const feeResult = calculateDeliveryFee(
        {
          baseFeeCents: matchingZone.baseFeeCents,
          perKmCents: matchingZone.perKmCents,
          minFeeCents: matchingZone.minFeeCents,
          maxKm: matchingZone.maxKm ?? undefined,
        },
        distanceKm,
      );

      const deliveryFeeCents = feeResult.ok ? feeResult.feeCents : matchingZone.baseFeeCents;

      const windows: BusinessWindow[] = m.hours.map((h) => ({
        weekday: h.weekday,
        openMinutes: h.openMinutes,
        closeMinutes: h.closeMinutes,
      }));

      const open = isOpenNow(windows, nowSãoPaulo.weekday, nowSãoPaulo.minuteOfDay);

      cards.push({
        id: m.id,
        name: m.name,
        slug: m.slug,
        categoryId: m.categoryId,
        categoryName: m.category?.name ?? 'Restaurante',
        logoUrl: m.logoUrl,
        coverUrl: m.coverUrl,
        ratingAvg: Number(m.ratingAvg),
        ratingCount: m.ratingCount,
        orderPrepMinutes: m.orderPrepMinutes,
        distanceKm: Math.round(distanceKm * 10) / 10,
        deliveryFeeCents,
        minOrderCents: matchingZone.minOrderCents,
        etaMinMinutes: matchingZone.etaMinMinutes ?? (m.orderPrepMinutes ?? 30) + 10,
        etaMaxMinutes: matchingZone.etaMaxMinutes ?? (m.orderPrepMinutes ?? 30) + 25,
        isOpen: open,
      });
    }

    // Ordena: abertos primeiro, depois por menor distância
    cards.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

    return cards;
  }

  async getMerchantDetail(idOrSlug: string, customerLoc?: { lat: number; lng: number }) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: 'ACTIVE',
      },
      include: {
        category: true,
        hours: true,
        zones: true,
      },
    });

    if (!merchant) {
      throw ApiError.notFound('LOJA_NAO_ENCONTRADA', 'Loja não encontrada ou inativa');
    }

    const nowSãoPaulo = this.getCurrentTimeInSaoPaulo();
    const windows: BusinessWindow[] = merchant.hours.map((h) => ({
      weekday: h.weekday,
      openMinutes: h.openMinutes,
      closeMinutes: h.closeMinutes,
    }));
    const open = isOpenNow(windows, nowSãoPaulo.weekday, nowSãoPaulo.minuteOfDay);

    let deliveryEstimate = null;
    if (customerLoc && merchant.lat && merchant.lng) {
      const distanceKm = haversineKm(
        { lat: Number(merchant.lat), lng: Number(merchant.lng) },
        customerLoc,
      );
      const zone = merchant.zones.find((z) => z.maxKm === null || distanceKm <= z.maxKm);
      if (zone) {
        const feeResult = calculateDeliveryFee(
          {
            baseFeeCents: zone.baseFeeCents,
            perKmCents: zone.perKmCents,
            minFeeCents: zone.minFeeCents,
            maxKm: zone.maxKm ?? undefined,
          },
          distanceKm,
        );

        deliveryEstimate = {
          distanceKm: Math.round(distanceKm * 10) / 10,
          feeCents: feeResult.ok ? feeResult.feeCents : zone.baseFeeCents,
          etaMinMinutes: zone.etaMinMinutes ?? 30,
          etaMaxMinutes: zone.etaMaxMinutes ?? 45,
        };
      }
    }

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        category: merchant.category?.name,
        description: merchant.description,
        logoUrl: merchant.logoUrl,
        coverUrl: merchant.coverUrl,
        ratingAvg: Number(merchant.ratingAvg),
        ratingCount: merchant.ratingCount,
        isOpen: open,
      },
      deliveryEstimate,
    };
  }

  private getCurrentTimeInSaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    }).formatToParts(new Date());

    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const weekday = WEEKDAY_INDEX[weekdayStr] ?? 0;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

    return {
      weekday,
      minuteOfDay: hour * 60 + minute,
    };
  }
}
