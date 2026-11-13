/**
 * F2 — Backoffice de parceiros: fila de onboarding (KYC), contratos e status.
 * Permissões: merchants.read (consulta), merchants.write (revisão/contrato/
 * pausa/encerramento), merchants.block (bloqueio).
 */
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import type {
  MerchantAdminDetail,
  MerchantContractUpsertInput,
  MerchantStatusActionInput,
  PartnerReviewInput,
} from '@ifastfood/contracts';
import {
  merchantContractUpsertSchema,
  merchantStatusActionSchema,
  paginationQuerySchema,
  partnerReviewSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../../common/pipes/zod.pipe';
import { CurrentUser, RequirePermissions } from '../../../identity/guards/decorators';
import type { Principal } from '../../../identity/types';
import { requestMeta } from '../../../identity/http/request-meta';
import { PartnersAdminService } from '../../services/partners-admin.service';

const partnerListQuerySchema = paginationQuerySchema
  .extend({
    status: z
      .enum(['ONBOARDING', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'BLOCKED', 'CLOSED'])
      .optional(),
  })
  .strict();
type PartnerListQuery = z.infer<typeof partnerListQuerySchema>;

@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly admin: PartnersAdminService) {}

  @Get()
  @RequirePermissions('merchants.read')
  list(@Query(new ZodValidationPipe(partnerListQuerySchema)) query: PartnerListQuery) {
    return this.admin.list(query);
  }

  @Get(':id')
  @RequirePermissions('merchants.read')
  detail(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
  ): Promise<MerchantAdminDetail> {
    return this.admin.detail(merchantId);
  }

  /** Aprovar (→ ACTIVE + contrato default se ausente) ou recusar (→ ONBOARDING). */
  @Post(':id/review')
  @RequirePermissions('merchants.write')
  review(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(partnerReviewSchema)) body: PartnerReviewInput,
  ): Promise<{ status: string }> {
    return this.admin.review(principal.userId, merchantId, body, requestMeta(request));
  }

  /** Plano/comissão — criado antes da aprovação ou ajustado no ACTIVE. */
  @Put(':id/contract')
  @RequirePermissions('merchants.write')
  @HttpCode(204)
  upsertContract(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(merchantContractUpsertSchema)) body: MerchantContractUpsertInput,
  ): Promise<void> {
    return this.admin.upsertContract(principal.userId, merchantId, body, requestMeta(request));
  }

  /** PAUSE/RESUME/CLOSE — operações comerciais. */
  @Post(':id/status')
  @RequirePermissions('merchants.write')
  statusAction(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(merchantStatusActionSchema)) body: MerchantStatusActionInput,
  ): Promise<{ status: string }> {
    return this.admin.statusAction(principal.userId, merchantId, body, requestMeta(request));
  }

  /** BLOCK/UNBLOCK — permissão mais fina (merchants.block). */
  @Post(':id/block')
  @RequirePermissions('merchants.block')
  block(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
  ): Promise<{ status: string }> {
    return this.admin.statusAction(
      principal.userId,
      merchantId,
      { action: 'BLOCK' },
      requestMeta(request),
    );
  }

  @Post(':id/unblock')
  @RequirePermissions('merchants.block')
  unblock(
    @Param('id', new ZodValidationPipe(uuidSchema)) merchantId: string,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
  ): Promise<{ status: string }> {
    return this.admin.statusAction(
      principal.userId,
      merchantId,
      { action: 'UNBLOCK' },
      requestMeta(request),
    );
  }
}
