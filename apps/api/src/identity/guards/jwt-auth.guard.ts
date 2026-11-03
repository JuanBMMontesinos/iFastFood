import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { IS_PUBLIC_KEY } from './decorators';
import type { Principal } from '../types';
import { TokenService } from '../crypto/token.service';

/**
 * Guard global: valida Bearer (RS256) e garante sessão viva no banco —
 * revogação funcionará mesmo com access ainda não expirado.
 * Rotas/classes decoradas com @Public() escapam (health, auth, otp…).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, unknown>;
      principal?: Principal;
    }>();
    const header = request.headers?.['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token de acesso ausente', 'TOKEN_AUSENTE');
    }

    const claims = await this.tokens.verifyAccess(header.slice(7).trim());

    const session = await this.prisma.session.findUnique({ where: { id: claims.sid } });
    if (!session || session.revokedAt) {
      throw ApiError.unauthorized('Sessão revogada ou inexistente', 'SESSAO_REVOCADA');
    }
    if (session.familyId !== claims.fam || session.userId !== claims.sub) {
      throw ApiError.unauthorized('Token inválido para a sessão atual', 'TOKEN_INVALIDO');
    }

    request.principal = {
      userId: session.userId,
      sessionId: session.id,
      familyId: session.familyId,
    } satisfies Principal;
    return true;
  }
}
