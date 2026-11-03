import { Body, Controller, Post } from '@nestjs/common';
import type { TotpSetupResponse } from '@ifastfood/contracts';
import { totpCodeSchema } from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { TotpService } from '../services/totp.service';
import { CurrentUser } from '../guards/decorators';
import type { Principal } from '../types';

/** 2FA por app autenticador (equipe do backoffice; opcional para outros). */
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly totp: TotpService) {}

  /** Passo 1 — segredo + URI otpauth:// (QR Code no portal, F5). */
  @Post('setup')
  setup(@CurrentUser() principal: Principal): Promise<TotpSetupResponse> {
    return this.totp.setup(principal.userId);
  }

  /** Passo 2 — ativa após confirmar um código real. */
  @Post('enable')
  enable(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(totpCodeSchema)) body: { code: string },
  ): Promise<{ enabled: true }> {
    return this.totp.enable(principal.userId, body.code);
  }

  @Post('disable')
  disable(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(totpCodeSchema)) body: { code: string },
  ): Promise<{ enabled: false }> {
    return this.totp.disable(principal.userId, body.code);
  }
}
