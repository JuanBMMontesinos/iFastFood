/**
 * Teste unitário do PrismaService sem banco real:
 * @prisma/client é mockado para validar apenas o ciclo de vida (hooks Nest).
 */
jest.mock('@prisma/client', () => {
  const state = { connectCalls: 0, disconnectCalls: 0 };
  class MockPrismaClient {
    async $connect(): Promise<void> {
      state.connectCalls += 1;
    }
    async $disconnect(): Promise<void> {
      state.disconnectCalls += 1;
    }
  }
  return { PrismaClient: MockPrismaClient, __mockState: state };
}, { virtual: true });

import * as client from '@prisma/client';
import { PrismaService } from './prisma.service';

describe('PrismaService (ciclo de vida, sem banco)', () => {
  const state = (client as unknown as { __mockState: { connectCalls: number; disconnectCalls: number } })
    .__mockState;

  it('onModuleInit conecta e onModuleDestroy desconecta', async () => {
    const service = new PrismaService();
    await service.onModuleInit();
    expect(state.connectCalls).toBe(1);
    await service.onModuleDestroy();
    expect(state.disconnectCalls).toBe(1);
  });

  it('pode ser instanciado várias vezes sem efeitos colaterais no mock', async () => {
    const a = new PrismaService();
    const b = new PrismaService();
    await a.onModuleInit();
    await b.onModuleInit();
    expect(state.connectCalls).toBe(3); // 1 do teste anterior + 2 deste
  });
});
