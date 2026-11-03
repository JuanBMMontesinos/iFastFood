import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { OtpVerifyResponse } from '@ifastfood/contracts';
import { otpRequestSchema, otpVerifySchema } from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { ApiError } from '../../common/api-error';
import { OtpService } from '../services/otp.service';
import { SessionService } from '../services/session.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { Public } from '../guards/decorators';
import { requestMeta } from './request-meta';

@Controller('auth/otp')
@Public()
export class OtpController {
  constructor(
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly limiter: RateLimiterService,
  ) {}

  /** Emitir código (janelas: 3/10min por ip, 5/1h por telefone). */
  @Post('request')
  async request(
    @Req() request: Request,
    @Body(new ZodValidationPipe(otpRequestSchema)) body: { phone: string },
  ): Promise<{ sent: true; devCode?: string }> {
    this.limiter.consume(`otp:ip:${request.ip ?? 'unknown'}`, 3, 10 * 60 * 1000);
    this.limiter.consume(`otp:phone:${body.phone}`, 5, 60 * 60 * 1000);

    const code = await this.otp.issue(
      body.phone,
      'PHONE_VERIFY',
      await this.otp.resolveUserIdByPhone(body.phone),
    );
    const response: { sent: true; devCode?: string } = { sent: true };
    if (process.env.NODE_ENV !== 'production') {
      response.devCode = code; // desenv: sem gateway SMS na F1
    }
    return response;
  }

  /** Conferir código → ativa conta → já entra com tokens de sessão. */
  @Post('verify')
  async verify(
    @Req() request: Request,
    @Body(new ZodValidationPipe(otpVerifySchema)) body: { phone: string; code: string },
  ): Promise<OtpVerifyResponse> {
    this.limiter.consume(`otpverify:ip:${request.ip ?? 'unknown'}`, 10, 10 * 60 * 1000);

    const { userId } = await this.otp.verify(body.phone, 'PHONE_VERIFY', body.code);
    if (!userId) {
      throw ApiError.notFound('CONTA_NAO_ENCONTRADA', 'Nenhuma conta ativa para este telefone');
    }
    await this.otp.completePhoneVerification(userId);
    const tokens = await this.sessions.createForLogin(userId, requestMeta(request));
    return { verified: true, userId, tokens };
  }
}
