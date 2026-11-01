/**
 * Smoke test de injeção de dependência da camada de saúde:
 * garante que o Nest resolve PrismaService (metadata de decorators),
 * que é justamente a classe que quebra silenciosamente se alguém usar
 * `import type` no controller — rodar junto com os testes unitários.
 */
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { HealthModule } from './health.module';

jest.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {},
}), { virtual: true });

describe('wiring de DI do Health', () => {
  it('resolve HealthController com PrismaService injetado', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: async () => [],
        $connect: async () => undefined,
        $disconnect: async () => undefined,
      })
      .compile();

    const controller = moduleRef.get(HealthController);
    expect(controller).toBeInstanceOf(HealthController);

    const status = await controller.ready();
    expect(status.database).toBe('up');
    expect(status.status).toBe('ok');
  });
});
