/**
 * Testes unitários do HealthController — sem banco real (fake via injeção).
 * PrismaService é mascarado para testar a lógica de readiness de forma determinística.
 */
import { HealthController } from './health.controller';

class FakePrisma {
  public shouldFail = false;
  async $queryRaw(): Promise<unknown[]> {
    if (this.shouldFail) {
      throw new Error('connection refused');
    }
    return [];
  }
}

describe('HealthController', () => {
  const controller = new HealthController(new FakePrisma() as never);

  describe('GET /health (liveness)', () => {
    it('retorna ok sem acessar o banco', () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('ifastfood-api');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('reporta database up quando o SELECT 1 funciona', async () => {
      const fake = new FakePrisma();
      const ctrl = new HealthController(fake as never);
      const result = await ctrl.ready();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('up');
      expect(result.timestamp).toBeTruthy();
    });

    it('reporta degraded quando o banco está fora', async () => {
      const fake = new FakePrisma();
      fake.shouldFail = true;
      const ctrl = new HealthController(fake as never);
      const result = await ctrl.ready();
      expect(result.status).toBe('degraded');
      expect(result.database).toBe('down');
    });
  });
});
