import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { AnonymizeSelfInput } from '@ifastfood/contracts';
import { anonymizeSelfSchema } from '@ifastfood/contracts';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { DsarService } from '../services/dsar.service';
import { CurrentUser } from '../guards/decorators';
import type { Principal } from '../types';
import { requestMeta } from './request-meta';

/** LGPD — direitos do titular sobre a própria conta (art. 16 e 18). */
@Controller('account')
export class AccountController {
  constructor(private readonly dsar: DsarService) {}

  /** Portabilidade: JSON estruturado com todos os dados do titular. */
  @Post('export')
  @HttpCode(200)
  export(@CurrentUser() principal: Principal): Promise<unknown> {
    return this.dsar.exportDataForUser(principal.userId);
  }

  /** Anonimização irreversível — requer senha (+TOTP quando ativo). */
  @Post('anonymize')
  @HttpCode(204)
  async anonymize(
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(anonymizeSelfSchema)) body: AnonymizeSelfInput,
  ): Promise<void> {
    await this.dsar.anonymize(principal.userId, body, requestMeta(request));
  }
}
