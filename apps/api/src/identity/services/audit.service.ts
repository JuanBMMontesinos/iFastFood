import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestMeta } from '../types';

export interface AuditEntry {
  action: string;
  actorUserId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
  /** Preenchido pelos controllers (ip/user-agent da requisição). */
  meta?: RequestMeta;
}

/**
 * Trilha de auditoria (LGPD art. 37; plano §7.6) — append-only.
 * Falha de gravação NUNCA quebra a operação principal (best-effort:
 * persistência reforçada/fila na F5). Nunca registrar senha, tokens,
 * segredos de 2FA — só evento, ator e metadados.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorUserId: entry.actorUserId ?? null,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          payload: entry.payload ? (entry.payload as unknown as Prisma.InputJsonObject) : undefined,
          ip: entry.meta?.ip ?? null,
          userAgent: entry.meta?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `AUDIT_WRITE_FALLBACK action=${entry.action} resource=${entry.resourceType}:${entry.resourceId ?? 'n/a'} — ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
