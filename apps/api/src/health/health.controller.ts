import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  database: 'up' | 'down';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — não acessa recursos externos. */
  @Get()
  live(): Pick<HealthStatus, 'status' | 'service' | 'uptimeSeconds'> {
    return {
      status: 'ok',
      service: 'ifastfood-api',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  /** Readiness — valida dependência crítica (Postgres). */
  @Get('ready')
  async ready(): Promise<HealthStatus> {
    let database: HealthStatus['database'] = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'ifastfood-api',
      version: process.env.APP_VERSION ?? '0.1.0',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
