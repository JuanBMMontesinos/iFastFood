import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { PERMISSIONS_KEY } from './decorators';
import { ADMIN_BYPASS_ROLE } from '../config';

/** RBAC fino: aplica @RequirePermissions(...). Sem metadado → passa direto. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ principal?: { userId: string } }>();
    if (!request.principal) {
      throw ApiError.unauthorized('Autenticação obrigatória', 'TOKEN_AUSENTE');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.principal.userId },
      include: { roles: { include: { permissions: true } } },
    });
    if (!user) {
      throw ApiError.forbidden('Usuário sem papéis atribuídos', 'SEM_PAPEIS');
    }

    if (user.roles.some((role) => role.name === ADMIN_BYPASS_ROLE)) {
      return true;
    }

    const granted = new Set<string>(
      user.roles.flatMap((role) => role.permissions.map((permission) => permission.code)),
    );
    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw ApiError.forbidden('Permissão insuficiente para esta operação', 'PERMISSAO_NEGADA', {
        missing,
      });
    }
    return true;
  }
}
