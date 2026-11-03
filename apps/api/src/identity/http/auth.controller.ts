import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  CustomerSignupInput,
  CustomerSignupResponse,
  LoginInput,
  LoginResponse,
  MeResponse,
  TokenPair,
} from '@ifastfood/contracts';
import { customerSignupSchema, loginSchema } from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { CurrentUser, Public } from '../guards/decorators';
import type { Principal } from '../types';
import { requestMeta } from './request-meta';
import { refreshBodySchema, type RefreshBody } from './dtos';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly limiter: RateLimiterService,
  ) {}

  /** Cadastro do app do cliente (acceptedLgpd obrigatório — contrato LGPD). */
  @Post('customers/signup')
  @Public()
  signup(
    @Req() request: Request,
    @Body(new ZodValidationPipe(customerSignupSchema)) body: CustomerSignupInput,
  ): Promise<CustomerSignupResponse> {
    this.limiter.consume(`signup:${request.ip ?? 'unknown'}`, 10, 60 * 60 * 1000);
    return this.auth.signupCustomer(body, requestMeta(request));
  }

  @Post('login')
  @Public()
  login(
    @Req() request: Request,
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<LoginResponse> {
    this.limiter.consume(`login:${request.ip ?? 'unknown'}`, 10, 5 * 60 * 1000);
    return this.auth.login(body, requestMeta(request));
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshBodySchema)) body: RefreshBody,
  ): Promise<TokenPair> {
    return this.sessions.rotate(body.refreshToken);
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  logout(@Body(new ZodValidationPipe(refreshBodySchema)) body: RefreshBody): Promise<void> {
    return this.sessions.logout(body.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() principal: Principal): Promise<MeResponse> {
    return this.auth.me(principal);
  }
}
