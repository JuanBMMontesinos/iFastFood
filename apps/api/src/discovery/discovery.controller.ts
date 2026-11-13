/**
 * F3 — Endpoints de Descoberta (públicos).
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import type { DiscoveryFeedQuery } from '@ifastfood/contracts';
import { discoveryFeedQuerySchema } from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { Public } from '../identity/guards/decorators';
import { DiscoveryService } from './discovery.service';

const merchantDetailQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get('feed')
  @Public()
  feed(@Query(new ZodValidationPipe(discoveryFeedQuerySchema)) query: DiscoveryFeedQuery) {
    return this.discovery.getFeed(query);
  }

  @Get('merchants/:idOrSlug')
  @Public()
  merchantDetail(
    @Param('idOrSlug') idOrSlug: string,
    @Query(new ZodValidationPipe(merchantDetailQuerySchema)) query: { lat?: number; lng?: number },
  ) {
    const customerLoc =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : undefined;
    return this.discovery.getMerchantDetail(idOrSlug, customerLoc);
  }
}
