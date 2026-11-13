import { PartnersService } from './partners.service';
import type { PartnerContext } from '../partner.guard';

describe('PartnersService', () => {
  let service: PartnersService;
  let merchants: any[];
  let users: any[];
  let hours: any[];
  let zones: any[];
  let categories: any[];
  let auditLogs: any[];

  beforeEach(() => {
    merchants = [];
    users = [];
    hours = [];
    zones = [];
    categories = [{ id: 'cat-1', name: 'Restaurante', slug: 'restaurante' }];
    auditLogs = [];

    const mockPrisma: any = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where.OR) {
            return users.find((u) => u.email === where.OR[0].email || u.phone === where.OR[1].phone) || null;
          }
          return null;
        },
        create: async ({ data }: any) => {
          const u = { id: `usr-${users.length + 1}`, ...data };
          users.push(u);
          return u;
        },
      },
      merchantCategory: {
        findUnique: async ({ where }: any) => categories.find((c) => c.id === where.id) || null,
      },
      merchant: {
        findUnique: async ({ where }: any) => {
          if (where.slug) return merchants.find((m) => m.slug === where.slug) || null;
          if (where.id) return merchants.find((m) => m.id === where.id) || null;
          return null;
        },
        create: async ({ data }: any) => {
          const m = { id: `merch-${merchants.length + 1}`, ...data };
          merchants.push(m);
          return m;
        },
        update: async ({ where, data }: any) => {
          const m = merchants.find((item) => item.id === where.id);
          Object.assign(m, data);
          return m;
        },
      },
      merchantStaff: {
        findFirst: async ({ where }: any) => {
          const m = merchants[0];
          if (!m) return null;
          return {
            id: 'staff-1',
            merchantId: m.id,
            userId: where.userId,
            role: 'OWNER',
            merchant: {
              ...m,
              contract: null,
              documents: [],
            },
          };
        },
      },
      businessHour: {
        deleteMany: async ({ where }: any) => {
          hours = hours.filter((h) => h.merchantId !== where.merchantId);
        },
        createMany: async ({ data }: any) => {
          hours.push(...data);
        },
        findMany: async ({ where }: any) => {
          return hours.filter((h) => h.merchantId === where.merchantId);
        },
      },
      deliveryZone: {
        create: async ({ data }: any) => {
          const z = { id: `zone-${zones.length + 1}`, ...data };
          zones.push(z);
          return z;
        },
        findUnique: async ({ where }: any) => zones.find((z) => z.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const z = zones.find((item) => item.id === where.id);
          Object.assign(z, data);
          return z;
        },
        delete: async ({ where }: any) => {
          const idx = zones.findIndex((item) => item.id === where.id);
          if (idx !== -1) zones.splice(idx, 1);
        },
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    const mockPasswords: any = {
      hash: async (pwd: string) => `hashed_${pwd}`,
    };

    const mockSessions: any = {
      createForLogin: async () => ({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        expiresInSeconds: 900,
      }),
    };

    const mockAudit: any = {
      log: async (entry: any) => auditLogs.push(entry),
    };

    const mockCipher: any = {
      encrypt: (v: string) => `encrypted_${v}`,
    };

    service = new PartnersService(
      mockPrisma,
      mockPasswords,
      mockSessions,
      mockAudit,
      mockCipher,
    );
  });

  it('deve realizar signup de parceiro com criação de usuário OWNER e loja ONBOARDING', async () => {
    const res = await service.signup(
      {
        merchantName: 'Pizzaria Top',
        categoryId: 'cat-1',
        ownerName: 'Mario Bros',
        email: 'mario@pizzaria.com',
        phone: '+5511999998888',
        password: 'Password123!',
        cnpj: '11222333000181',
        acceptedLgpd: true,
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(res.merchantId).toBeDefined();
    expect(res.status).toBe('ONBOARDING');
    expect(res.accessToken).toBe('mock-access');
    expect(users[0].userType).toBe('MERCHANT_STAFF');
    expect(merchants[0].name).toBe('Pizzaria Top');
    expect(merchants[0].slug).toBe('pizzaria-top');
    expect(auditLogs.some((a) => a.action === 'PARCEIRO_CRIADO')).toBe(true);
  });

  it('deve cadastrar e listar horários de funcionamento', async () => {
    const partner: PartnerContext = {
      merchantId: 'merch-1',
      merchantName: 'Pizzaria Top',
      merchantStatus: 'ONBOARDING',
      staffRole: 'OWNER',
    };

    await service.setHours(
      partner,
      'usr-1',
      {
        hours: [
          { weekday: 1, open: '18:00', close: '23:30' },
          { weekday: 2, open: '18:00', close: '23:30' },
        ],
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    const list = await service.listHours('merch-1');
    expect(list.length).toBe(2);
    expect(list[0]!.openMinutes).toBe(1080);
    expect(list[0]!.closeMinutes).toBe(1410);
  });

  it('deve criar, atualizar e remover áreas de entrega (DeliveryZone)', async () => {
    const partner: PartnerContext = {
      merchantId: 'merch-1',
      merchantName: 'Pizzaria Top',
      merchantStatus: 'ONBOARDING',
      staffRole: 'OWNER',
    };

    const zone = await service.createZone(
      partner,
      'usr-1',
      {
        name: 'Raio 5km',
        type: 'RADIUS',
        baseFeeCents: 500,
        perKmCents: 150,
        minFeeCents: 500,
        maxKm: 5,
        minOrderCents: 2000,
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(zone.id).toBeDefined();
    expect(zones.length).toBe(1);

    const updated = await service.updateZone(
      partner,
      'usr-1',
      zone.id,
      {
        name: 'Raio 7km',
        type: 'RADIUS',
        baseFeeCents: 600,
        perKmCents: 150,
        minFeeCents: 600,
        maxKm: 7,
        minOrderCents: 2500,
      },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(updated.name).toBe('Raio 7km');

    await service.deleteZone(partner, 'usr-1', zone.id, { ip: '127.0.0.1', userAgent: 'test' });
    expect(zones.length).toBe(0);
  });
});
