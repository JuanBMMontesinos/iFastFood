import { Injectable } from '@nestjs/common';
import type { AdminCreateStaffInput, AdminUserResponse, RoleResponse } from '@ifastfood/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/api-error';
import { ADMIN_BYPASS_ROLE } from '../config';
import { PasswordService } from '../crypto/password.service';
import { AuditService } from './audit.service';
import type { RequestMeta } from '../types';

/**
 * Gestão de usuários do backoffice (F1/Gate de RBAC).
 * Auto-escalação bloqueada: só quem tem `admin.write` pode criar ADMIN.
 */
@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /** Equipe do backoffice (userType=STAFF) com seus papéis. */
  async listStaff(params: { take: number; skip: number }): Promise<AdminUserResponse[]> {
    const users = await this.prisma.user.findMany({
      where: { userType: 'STAFF' },
      take: params.take,
      skip: params.skip,
      orderBy: { createdAt: 'asc' },
      include: { roles: { select: { name: true } } },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      userType: user.userType,
      status: user.status,
      roleNames: user.roles.map((role) => role.name),
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async listRoles(): Promise<RoleResponse[]> {
    const roles = await this.prisma.role.findMany({
      where: { isSystem: true },
      orderBy: { name: 'asc' },
      include: { permissions: { select: { code: true } } },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions.map((permission) => permission.code),
    }));
  }

  /** Criação de staff (ativação imediata; convite formal na F5). */
  async createStaff(
    input: AdminCreateStaffInput,
    actorId: string,
    meta: RequestMeta,
  ): Promise<AdminUserResponse> {
    const email = input.email.toLowerCase();
    const role = await this.prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) {
      throw ApiError.badRequest('ROLE_NAO_ENCONTRADA', `Papel "${input.roleName}" não existe`);
    }
    if (role.name === ADMIN_BYPASS_ROLE && !(await this.actorHasPermission(actorId, 'admin.write'))) {
      throw ApiError.forbidden(
        'Criar usuários ADMIN requer a permissão admin.write',
        'ESCALACAO_NEGADA',
      );
    }

    const clash = await this.prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (clash) {
      throw ApiError.conflict('DADOS_EM_USO', 'E-mail já cadastrado');
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash: await this.passwords.hash(input.password),
        userType: 'STAFF',
        status: 'ACTIVE',
        roles: { connect: [{ id: role.id }] },
      },
      include: { roles: { select: { name: true } } },
    });
    await this.audit.log({
      actorUserId: actorId,
      action: 'STAFF_CRIADO',
      resourceType: 'User',
      resourceId: user.id,
      payload: { email, roleName: role.name },
      meta,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? '',
      userType: user.userType,
      status: user.status,
      roleNames: user.roles.map((role) => role.name),
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async actorHasPermission(actorId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: { roles: { include: { permissions: true } } },
    });
    if (!user) return false;
    if (user.roles.some((role) => role.name === ADMIN_BYPASS_ROLE)) return true;
    return user.roles.some((role) =>
      role.permissions.some((permission) => permission.code === code),
    );
  }
}
