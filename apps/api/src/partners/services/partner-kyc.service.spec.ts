import { PartnerKycService } from './partner-kyc.service';
import type { PartnerContext } from '../partner.guard';

describe('PartnerKycService', () => {
  let service: PartnerKycService;
  let documents: any[];
  let merchant: any;
  let auditLogs: any[];

  beforeEach(() => {
    documents = [];
    merchant = { id: 'merch-1', status: 'ONBOARDING' };
    auditLogs = [];

    const mockPrisma: any = {
      merchantDocument: {
        upsert: async ({ where, create, update }: any) => {
          const existingIdx = documents.findIndex(
            (d) => d.merchantId === where.merchantId_type.merchantId && d.type === where.merchantId_type.type,
          );
          if (existingIdx !== -1) {
            Object.assign(documents[existingIdx], update);
            return documents[existingIdx];
          }
          const row = { id: `doc-${documents.length + 1}`, ...create, status: 'PENDING' };
          documents.push(row);
          return row;
        },
      },
      merchant: {
        findUnique: async () => merchant,
        update: async ({ data }: any) => {
          Object.assign(merchant, data);
          return merchant;
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    const mockAudit: any = {
      log: async (entry: any) => auditLogs.push(entry),
    };

    service = new PartnerKycService(mockPrisma, mockAudit);
  });

  it('deve salvar documentos de KYC e transicionar loja de ONBOARDING para PENDING_REVIEW', async () => {
    const partner: PartnerContext = {
      merchantId: 'merch-1',
      merchantName: 'Pizzaria Top',
      merchantStatus: 'ONBOARDING',
      staffRole: 'OWNER',
    };

    const res = await service.submit(
      partner,
      'usr-1',
      {
        documents: [
          { type: 'CNPJ_CARD', fileUrl: 'https://storage/cnpj.pdf' },
          { type: 'SOCIAL_CONTRACT', fileUrl: 'https://storage/contrato.pdf' },
          { type: 'ID_CARD', fileUrl: 'https://storage/rg.pdf' },
        ],
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(res.status).toBe('PENDING_REVIEW');
    expect(merchant.status).toBe('PENDING_REVIEW');
    expect(documents.length).toBe(3);
    expect(documents.every((d) => d.status === 'PENDING')).toBe(true);
    expect(auditLogs.some((a) => a.action === 'KYC_ENVIADO')).toBe(true);
  });
});
