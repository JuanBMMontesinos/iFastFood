import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AdminCreateStaffInput,
  AdminUserResponse,
  RoleResponse,
} from '@ifastfood/contracts';
import { adminCreateStaffSchema } from '@ifastfood/contracts';
import { ZodValidationPipe } from '../../../common/pipes/zod.pipe';
import { UsersAdminService } from '../../services/users-admin.service';
import { CurrentUser, RequirePermissions } from '../../guards/decorators';
import type { Principal } from '../../types';
import { requestMeta } from '../request-meta';

/** Backoffice — usuários da própria equipe + matriz de papéis. */
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: UsersAdminService) {}

  @Get()
  @RequirePermissions('users.read')
  list(
    @Query() query: Record<string, string | undefined>,
  ): Promise<AdminUserResponse[]> {
    const take = Math.min(Number(query.take) || 25, 100);
    const skip = Math.max(Number(query.skip) || 0, 0);
    return this.admin.listStaff({ take, skip });
  }

  @Post()
  @HttpCode(201)
  @RequirePermissions('users.write')
  create(
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(adminCreateStaffSchema)) body: AdminCreateStaffInput,
  ): Promise<AdminUserResponse> {
    return this.admin.createStaff(body, principal.userId, requestMeta(request));
  }

  /** Papéis do sistema + permissões (renderiza matriz de acesso no portal). */
  @Get('roles')
  @RequirePermissions('users.read')
  roles(): Promise<RoleResponse[]> {
    return this.admin.listRoles();
  }
}
