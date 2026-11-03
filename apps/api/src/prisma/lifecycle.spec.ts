/**
 * Teste unitário do PrismaService sem banco real:
 * @prisma/client é mockado para validar apenas o ciclo de vida (hooks Nest).
 * Estado do mock é zerado por teste — sem acoplamento entre testes.
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
});

import * as client from '@prisma/client';
import { PrismaService } from './prisma.service';

const state = (client as unknown as { __mockState: { connectCalls: number; disconnectCalls: number } })
  .__mockState;

describe('PrismaService (ciclo de vida, sem banco)', () => {
  beforeEach(() => {
    state.connectCalls = 0;
    state.disconnectCalls = 0;
  });

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
    expect(state.connectCalls).toBe(2);
    expect(state.disconnectCalls).toBe(0);
  });
});
