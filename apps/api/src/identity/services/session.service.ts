import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { TokenPair } from '@ifastfood/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_MS } from '../config';
import { TokenService } from '../crypto/token.service';
import { sha256Hex } from '../crypto/sha256';
import { AuditService } from './audit.service';
import type { RequestMeta } from '../types';

/**
 * Ciclo de vida da sessão (plano §7.3):
 *  - login abre uma FAMÍLIA (`familyId`) de tokens;
 *  - cada refresh é rotacionado (consumo → substituição, com `replacedBy`);
 *  - apresentação de token já revogado = reuso/roubo → revoga a família
 *    inteira +evento de auditoria (padrão de detecção de reuso).
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  /** Login: família nova + refresh inicial + access token (RS256, 15min). */
  async createForLogin(userId: string, meta: RequestMeta): Promise<TokenPair> {
    const familyId = randomUUID();
    const session = await this.prisma.session.create({
      data: {
        userId,
        familyId,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    const refreshToken = await this.mint(session.id, null);
    const accessToken = await this.tokens.createAccessToken(
      { sub: userId, sid: session.id, fam: familyId },
      ACCESS_TTL_SECONDS,
    );
    return { accessToken, refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS };
  }

  private async mint(sessionId: string, replacedBy: string | null): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        sessionId,
        tokenHash: sha256Hex(raw),
        replacedBy,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return raw;
  }

  /** Rotaciona um refresh válido; reuso de token revogado invalida a família. */
  async rotate(presentedRaw: string): Promise<TokenPair> {
    const presentedHash = sha256Hex(presentedRaw);
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: presentedHash },
      include: { session: true },
    });
    if (!token) {
      throw ApiError.unauthorized('Sessão inválida', 'SESSAO_INVALIDA');
    }

    if (token.revokedAt) {
      await this.revokeFamily(token.session.familyId);
      await this.audit.log({
        actorUserId: token.session.userId,
        action: 'REFRESH_REUSO_DETECTADO',
        resourceType: 'Session',
        resourceId: token.session.id,
        payload: { familyId: token.session.familyId },
      });
      throw ApiError.unauthorized(
        'Token de refresh reutilizado — todas as sessões da família foram revogadas',
        'REUSE_DETECTED',
      );
    }

    if (token.session.revokedAt) {
      throw ApiError.unauthorized('Sessão revogada', 'SESSAO_REVOCADA');
    }

    const now = Date.now();
    if (token.expiresAt.getTime() < now || token.session.expiresAt.getTime() < now) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Sessão expirada', 'SESSAO_EXPIRADA');
    }

    const newRaw = await this.mint(token.sessionId, presentedHash);
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date(), replacedBy: sha256Hex(newRaw) },
      }),
      this.prisma.session.update({
        where: { id: token.sessionId },
        data: { expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
      }),
    ]);

    const accessToken = await this.tokens.createAccessToken(
      {
        sub: token.session.userId,
        sid: token.session.id,
        fam: token.session.familyId,
      },
      ACCESS_TTL_SECONDS,
    );
    return { accessToken, refreshToken: newRaw, accessExpiresIn: ACCESS_TTL_SECONDS };
  }

  /** Logout de um dispositivo: sessão + todos os refresh daquele sessionId. */
  async logout(presentedRaw: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256Hex(presentedRaw) },
      include: { session: true },
    });
    if (!token || token.session.revokedAt) {
      return; // idempotente
    }
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: token.sessionId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: token.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log({
      actorUserId: token.session.userId,
      action: 'LOGOUT',
      resourceType: 'Session',
      resourceId: token.sessionId,
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session: { familyId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
