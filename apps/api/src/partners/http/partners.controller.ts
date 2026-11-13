/**
 * F2 — Endpoints self-service do parceiro (Portal do Parceiro).
 * Máximo de exigência de cargo: leitura para toda a equipe; mutações de
 * perfil/horários/zonas/KYC OWNER ou MANAGER; equipe apenas OWNER.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  BusinessHoursSetInput,
  DeliveryZoneInput,
  KycSubmitInput,
  MerchantProfileUpdateInput,
  MerchantSignupInput,
  MerchantSignupResponse,
  PartnerProfile,
  PartnerStaffInviteInput,
} from '@ifastfood/contracts';
import {
  businessHoursSetSchema,
  deliveryZoneInputSchema,
  kycSubmitSchema,
  merchantProfileUpdateSchema,
  merchantSignupSchema,
  partnerStaffInviteSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { CurrentUser, Public } from '../../identity/guards/decorators';
import type { Principal } from '../../identity/types';
import { requestMeta } from '../../identity/http/request-meta';
import { RateLimiterService } from '../../identity/security/rate-limiter.service';
import { Partner, PartnerGuard, RequireStaffRole, type PartnerContext } from '../partner.guard';
import { PartnersService } from '../services/partners.service';
import { PartnerKycService } from '../services/partner-kyc.service';
import { PartnerStaffService } from '../services/partner-staff.service';

@UseGuards(PartnerGuard)
@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly kyc: PartnerKycService,
    private readonly staff: PartnerStaffService,
    private readonly limiter: RateLimiterService,
  ) {}

  /** Cadastro público de parceiro (owner vira usuário + loja ONBOARDING). */
  @Post('signup')
  @Public()
  signup(
    @Req() request: Request,
    @Body(new ZodValidationPipe(merchantSignupSchema)) body: MerchantSignupInput,
  ): Promise<MerchantSignupResponse> {
    this.limiter.consume(`partner-signup:${request.ip ?? 'unknown'}`, 10, 60 * 60 * 1000);
    return this.partners.signup(body, requestMeta(request));
  }

  @Get('me')
  me(@CurrentUser() principal: Principal): Promise<PartnerProfile> {
    return this.partners.myProfile(principal);
  }

  @Put('me')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  updateProfile(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(merchantProfileUpdateSchema)) body: MerchantProfileUpdateInput,
  ): Promise<void> {
    return this.partners.updateProfile(partner, principal.userId, body, requestMeta(request));
  }

  @Get('me/hours')
  hours(@Partner() partner: PartnerContext) {
    return this.partners.listHours(partner.merchantId);
  }

  @Put('me/hours')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  setHours(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(businessHoursSetSchema)) body: BusinessHoursSetInput,
  ): Promise<void> {
    return this.partners.setHours(partner, principal.userId, body, requestMeta(request));
  }

  /** Badge 'aberto agora' no portal — fuso America/Sao_Paulo. */
  @Get('me/open-now')
  openNow(@Partner() partner: PartnerContext): Promise<{ open: boolean }> {
    return this.partners.isOpenNow(partner.merchantId).then((open) => ({ open }));
  }

  // ---- Áreas de entrega -------------------------------------------------------
  @Post('me/zones')
  @RequireStaffRole('OWNER', 'MANAGER')
  createZone(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(deliveryZoneInputSchema)) body: DeliveryZoneInput,
  ) {
    return this.partners.createZone(partner, principal.userId, body, requestMeta(request));
  }

  @Put('me/zones/:zoneId')
  @RequireStaffRole('OWNER', 'MANAGER')
  updateZone(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('zoneId') zoneId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(deliveryZoneInputSchema)) body: DeliveryZoneInput,
  ) {
    return this.partners.updateZone(partner, principal.userId, zoneId, body, requestMeta(request));
  }

  @Delete('me/zones/:zoneId')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  deleteZone(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('zoneId') zoneId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.partners.deleteZone(partner, principal.userId, zoneId, requestMeta(request));
  }

  // ---- KYC --------------------------------------------------------------------
  @Post('me/kyc')
  @RequireStaffRole('OWNER', 'MANAGER')
  submitKyc(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(kycSubmitSchema)) body: KycSubmitInput,
  ) {
    return this.kyc.submit(partner, principal.userId, body, requestMeta(request));
  }

  // ---- Equipe -----------------------------------------------------------------
  @Post('me/staff')
  @RequireStaffRole('OWNER')
  inviteStaff(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(partnerStaffInviteSchema)) body: PartnerStaffInviteInput,
  ) {
    return this.staff.invite(partner, principal.userId, body, requestMeta(request));
  }

  @Delete('me/staff/:userId')
  @RequireStaffRole('OWNER')
  @HttpCode(204)
  removeStaff(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('userId') targetUserId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.staff.remove(partner, principal.userId, targetUserId, requestMeta(request));
  }
}
