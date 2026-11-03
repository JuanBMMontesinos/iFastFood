import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { OTP_MAX_ATTEMPTS, OTP_PEPPER, OTP_TTL_MS } from '../config';
import { sha256Hex } from '../crypto/sha256';

export type OtpPurpose = 'PHONE_VERIFY' | 'LOGIN';

function codeHash(phone: string, code: string): string {
  return sha256Hex(`${OTP_PEPPER}:${phone}:${code}`);
}

/**
 * Desafios de OTP por telefone (hash + pepper no lugar do código cru).
 * Novos desafios invalidam os pendentes anteriores; tentativas erradas são
 * contadas no banco — limite persiste entre reinícios do processo.
 */
@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emite código de 6 dígitos (entrega por SMS chega na F6; `devCode` fora de produção). */
  async issue(phone: string, purpose: OtpPurpose, userId?: string | null): Promise<string> {
    const code = String(randomInt(100_000, 1_000_000));
    const now = new Date();
    await this.prisma.otpChallenge.updateMany({
      where: { targetPhone: phone, purpose, consumedAt: null },
      data: { consumedAt: now },
    });
    await this.prisma.otpChallenge.create({
      data: {
        userId: userId ?? null,
        targetPhone: phone,
        purpose,
        codeHash: codeHash(phone, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    });
    return code;
  }

  /** Resolve o dono do telefone (vínculo do desafio no momento do issue). */
  async resolveUserIdByPhone(phone: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return user?.id ?? null;
  }

  /**
   * Confere e consome o desafio mais recente.
   * Ao atingir o limite de tentativas, o desafio é consumido (400→429).
   */
  async verify(phone: string, purpose: OtpPurpose, code: string): Promise<{ userId: string | null }> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { targetPhone: phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw ApiError.badRequest('OTP_INVALIDO', 'Código inválido ou expirado — solicite um novo');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw ApiError.badRequest('OTP_EXPIRADO', 'Código expirado — solicite um novo');
    }
    if (codeHash(phone, code) !== challenge.codeHash) {
      const attempts = challenge.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts, consumedAt: new Date() },
        });
        throw ApiError.tooManyRequests('Muitas tentativas incorretas — solicite um novo código');
      }
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts } });
      throw ApiError.badRequest('OTP_INVALIDO', 'Código inválido');
    }
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return { userId: challenge.userId };
  }

  /** Ativa a conta após verificação de telefone (idempotente). */
  async completePhoneVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('CONTA_NAO_ENCONTRADA', 'Conta não encontrada');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
    });
  }
}
