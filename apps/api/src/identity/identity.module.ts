import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PasswordService } from './crypto/password.service';
import { TokenService } from './crypto/token.service';
import { FieldCipher } from './crypto/field-cipher';
import { AuditService } from './services/audit.service';
import { OtpService } from './services/otp.service';
import { TotpService } from './services/totp.service';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
import { DsarService } from './services/dsar.service';
import { UsersAdminService } from './services/users-admin.service';
import { RateLimiterService } from './security/rate-limiter.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthController } from './http/auth.controller';
import { OtpController } from './http/otp.controller';
import { TwoFactorController } from './http/twofactor.controller';
import { AccountController } from './http/account.controller';
import { AdminUsersController } from './http/admin/users.controller';

/**
 * F1 — Identidade, RBAC, LGPD e auditoria.
 *
 * Guards globais (nesta ordem):
 *  1. JwtAuthGuard — valida access token + sessão viva;
 *  2. PermissionsGuard — aplica @RequirePermissions (bypass ADMIN).
 */
@Module({
  controllers: [
    AuthController,
    OtpController,
    TwoFactorController,
    AccountController,
    AdminUsersController,
  ],
  providers: [
    PasswordService,
    TokenService,
    FieldCipher,
    AuditService,
    OtpService,
    TotpService,
    SessionService,
    AuthService,
    DsarService,
    UsersAdminService,
    RateLimiterService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [
    PasswordService,
    SessionService,
    TokenService,
    AuditService,
    FieldCipher,
    RateLimiterService,
    OtpService,
    TotpService,
    AuthService,
  ],
})
export class IdentityModule {}
