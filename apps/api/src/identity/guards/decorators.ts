import {
  createParamDecorator,
  SetMetadata,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Principal } from '../types';

export const IS_PUBLIC_KEY = 'ifastfood:is-public';

/** Marca rota/classe como pública (escapa do JwtAuthGuard global). */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'ifastfood:permissions';

/** Exige permissões de backoffice (PermissionsGuard; bypass para ADMIN). */
export const RequirePermissions = (...codes: string[]): CustomDecorator =>
  SetMetadata(PERMISSIONS_KEY, codes);

/** Principal do access token (usuário + sessão viva), injetado pelo guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal => {
    const request = context.switchToHttp().getRequest<{ principal: Principal }>();
    return request.principal;
  },
);
