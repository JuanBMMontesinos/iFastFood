import { PartnersAdminService, DEFAULT_CONTRACT } from './partners-admin.service';

describe('PartnersAdminService', () => {
  let service: PartnersAdminService;
  let merchants: any[];
  let contracts: any[];
  let documents: any[];
  let auditLogs: any[];

  beforeEach(() => {
    merchants = [
      {
        id: 'merch-1',
        name: 'Pizzaria Top',
        slug: 'pizzaria-top',
        status: 'PENDING_REVIEW',
        categoryId: 'cat-1',
      },
    ];
    contracts = [];
    documents = [
      { id: 'd-1', merchantId: 'merch-1', type: 'CNPJ_CARD', status: 'PENDING' },
      { id: 'd-2', merchantId: 'merch-1', type: 'SOCIAL_CONTRACT', status: 'PENDING' },
      { id: 'd-3', merchantId: 'merch-1', type: 'ID_CARD', status: 'PENDING' },
    ];
    auditLogs = [];

    const mockPrisma: any = {
      merchant: {
        findUnique: async ({ where }: any) => {
          const m = merchants.find((item) => item.id === where.id);
          if (!m) return null;
          return {
            ...m,
            contract: contracts.find((c) => c.merchantId === m.id) || null,
            documents: documents.filter((d) => d.merchantId === m.id),
          };
        },
        update: async ({ where, data }: any) => {
          const m = merchants.find((item) => item.id === where.id);
          Object.assign(m, data);
          return m;
        },
      },
      merchantDocument: {
        findMany: async ({ where }: any) => {
          return documents.filter((d) => d.merchantId === where.merchantId);
        },
        updateMany: async ({ where, data }: any) => {
          documents
            .filter((d) => d.merchantId === where.merchantId)
            .forEach((d) => Object.assign(d, data));
        },
      },
      merchantContract: {
        findUnique: async ({ where }: any) =>
          contracts.find((c) => c.merchantId === where.merchantId) || null,
        create: async ({ data }: any) => {
          const c = { id: `cont-${contracts.length + 1}`, ...data, signedAt: new Date() };
          contracts.push(c);
          return c;
        },
        upsert: async ({ where, create, update }: any) => {
          const idx = contracts.findIndex((c) => c.merchantId === where.merchantId);
          if (idx !== -1) {
            Object.assign(contracts[idx], update);
            return contracts[idx];
          }
          const c = { id: `cont-${contracts.length + 1}`, ...create, signedAt: new Date() };
          contracts.push(c);
          return c;
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    const mockAudit: any = {
      log: async (entry: any) => auditLogs.push(entry),
    };

    service = new PartnersAdminService(mockPrisma, mockAudit);
  });

  it('deve aprovar parceiro: aprova docs, cria contrato default e ativa loja', async () => {
    const res = await service.review(
      'admin-usr',
      'merch-1',
      { decision: 'APPROVE' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(res.status).toBe('ACTIVE');
    expect(merchants[0].status).toBe('ACTIVE');
    expect(documents.every((d) => d.status === 'APPROVED')).toBe(true);
    expect(contracts.length).toBe(1);
    expect(contracts[0].plan).toBe(DEFAULT_CONTRACT.plan);
    expect(auditLogs.some((a) => a.action === 'KYC_APROVADO')).toBe(true);
  });

  it('deve pausar e reativar loja via statusAction', async () => {
    merchants[0].status = 'ACTIVE';

    const paused = await service.statusAction(
      'admin-usr',
      'merch-1',
      { action: 'PAUSE' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );
    expect(paused.status).toBe('PAUSED');
    expect(merchants[0].status).toBe('PAUSED');

    const resumed = await service.statusAction(
      'admin-usr',
      'merch-1',
      { action: 'RESUME' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );
    expect(resumed.status).toBe('ACTIVE');
    expect(merchants[0].status).toBe('ACTIVE');
  });
});
