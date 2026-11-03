import { Injectable } from '@nestjs/common';
import { buildOtpauthUri, generateTotpSecret, verifyTotp } from '@ifastfood/domain';
import type { TotpSetupResponse } from '@ifastfood/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { FieldCipher } from '../crypto/field-cipher';
import { AuditService } from './audit.service';

const ISSUER_LABEL = 'iFastFood';

/**
 * 2FA por TOTP (RFC 6238) para equipe do backoffice — plano §7.4 e ASVS 2.4:
 * segredo CIFRADO EM REPOUSO (AES-256-GCM, FieldCipher) — mesmo padrão do
 * restante da PII. O segredo só ativa após um código confirmado (setup → enable).
 */
@Injectable()
export class TotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cipher: FieldCipher,
  ) {}

  async setup(userId: string): Promise<TotpSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }
    if (user.twoFactorEnabled) {
      throw ApiError.badRequest('2FA_JA_ATIVO', '2FA já está ativo — desative primeiro');
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.cipher.encrypt(secret) },
    });
    return {
      secret,
      otpauthUri: buildOtpauthUri(secret, user.email ?? userId, ISSUER_LABEL),
    };
  }

  async enable(userId: string, code: string): Promise<{ enabled: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }
    if (user.twoFactorEnabled) {
      throw ApiError.badRequest('2FA_JA_ATIVO', '2FA já está ativo');
    }
    if (!user.twoFactorSecret) {
      throw ApiError.badRequest('2FA_SETUP_PENDENTE', 'Conclua /auth/2fa/setup antes de ativar');
    }
    if (!this.verifyForLogin(user.twoFactorSecret, code)) {
      throw ApiError.badRequest('TOTP_INVALIDO', 'Código inválido — aguarde o próximo passo de tempo');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    await this.audit.log({
      actorUserId: userId,
      action: '2FA_ATIVADO',
      resourceType: 'User',
      resourceId: userId,
    });
    return { enabled: true };
  }

  async disable(userId: string, code: string): Promise<{ enabled: false }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled) {
      throw ApiError.badRequest('2FA_INATIVO', '2FA não está ativo');
    }
    const secret = user.twoFactorSecret;
    if (!secret || !this.verifyForLogin(secret, code)) {
      throw ApiError.badRequest('TOTP_INVALIDO', 'Código inválido');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.audit.log({
      actorUserId: userId,
      action: '2FA_DESATIVADO',
      resourceType: 'User',
      resourceId: userId,
    });
    return { enabled: false };
  }

  /** Verificação usada no login e em operações sensíveis (DSAR). */
  verifyForLogin(stored: string | null, code: string): boolean {
    const secret = this.resolveSecret(stored);
    return secret !== null && verifyTotp(secret, code, Date.now(), 1);
  }

  /**
   * Resolve o segredo de \"formação\" do banco:
   *  - payload cifrado (`v1.iv.tag.ct`) → decripta (chave errada → null);
   *  - valor em claro → legado pré-cifragem, verificado como está.
   */
  private resolveSecret(stored: string | null): string | null {
    if (stored === null) return null;
    if (!stored.startsWith('v1.')) return stored;
    try {
      return this.cipher.decrypt(stored);
    } catch {
      return null; // chave incorreta/dado corrompido: 2FA recusa em vez de vazar
    }
  }
}
