import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let customers: any[];
  let users: any[];
  let addresses: any[];
  let auditLogs: any[];

  beforeEach(() => {
    users = [{ id: 'usr-1', name: 'João Silva', email: 'joao@email.com', phone: '+5511988887777' }];
    customers = [];
    addresses = [];
    auditLogs = [];

    const mockPrisma: any = {
      user: {
        findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const u = users.find((item) => item.id === where.id);
          Object.assign(u, data);
          return u;
        },
      },
      customer: {
        findUnique: async ({ where }: any) => {
          const c = customers.find((item) => item.userId === where.userId);
          if (!c) return null;
          return {
            ...c,
            user: users.find((u) => u.id === c.userId),
            addresses: addresses.filter((a) => a.customerId === c.id),
          };
        },
        create: async ({ data }: any) => {
          const c = { id: `cust-${customers.length + 1}`, ...data };
          customers.push(c);
          return {
            ...c,
            user: users.find((u) => u.id === c.userId),
            addresses: [],
          };
        },
      },
      address: {
        findUnique: async ({ where }: any) => addresses.find((a) => a.id === where.id) || null,
        findMany: async ({ where }: any) => addresses.filter((a) => a.customerId === where.customerId),
        count: async ({ where }: any) => addresses.filter((a) => a.customerId === where.customerId).length,
        create: async ({ data }: any) => {
          const a = {
            id: `addr-${addresses.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          addresses.push(a);
          return a;
        },
        update: async ({ where, data }: any) => {
          const a = addresses.find((item) => item.id === where.id);
          Object.assign(a, data);
          return a;
        },
        updateMany: async ({ where, data }: any) => {
          addresses
            .filter((a) => a.customerId === where.customerId)
            .forEach((a) => Object.assign(a, data));
        },
        delete: async ({ where }: any) => {
          const idx = addresses.findIndex((item) => item.id === where.id);
          if (idx !== -1) addresses.splice(idx, 1);
        },
      },
      $transaction: async (fn: any) => {
        if (Array.isArray(fn)) return Promise.all(fn);
        return fn(mockPrisma);
      },
    };

    const mockAudit: any = {
      log: async (entry: any) => auditLogs.push(entry),
    };

    service = new CustomerService(mockPrisma, mockAudit);
  });

  it('deve obter ou criar perfil do cliente automaticamente no primeiro acesso', async () => {
    const profile = await service.getProfile('usr-1');
    expect(profile.name).toBe('João Silva');
    expect(profile.email).toBe('joao@email.com');
    expect(customers.length).toBe(1);
  });

  it('deve cadastrar endereço e torná-lo padrão se for o primeiro', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };
    const addr = await service.createAddress(
      'usr-1',
      {
        label: 'Casa',
        street: 'Av Paulista',
        number: '1000',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
        lat: -23.561684,
        lng: -46.655981,
        isDefault: false,
      },
      meta,
    );

    expect(addr.id).toBe('addr-1');
    expect(addr.isDefault).toBe(true); // primeiro endereço vira default automaticamente
    expect(addresses.length).toBe(1);
    expect(auditLogs.some((a) => a.action === 'ENDERECO_CRIADO')).toBe(true);
  });

  it('deve alternar endereço padrão corretamente', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };
    const a1 = await service.createAddress(
      'usr-1',
      {
        label: 'Casa',
        street: 'Rua A',
        number: '10',
        district: 'Centro',
        city: 'SP',
        state: 'SP',
        zipCode: '01000000',
        lat: -23.5,
        lng: -46.6,
        isDefault: true,
      },
      meta,
    );

    const a2 = await service.createAddress(
      'usr-1',
      {
        label: 'Trabalho',
        street: 'Rua B',
        number: '20',
        district: 'Centro',
        city: 'SP',
        state: 'SP',
        zipCode: '01000000',
        lat: -23.5,
        lng: -46.6,
        isDefault: true,
      },
      meta,
    );

    expect(addresses.find((a) => a.id === a1.id).isDefault).toBe(false);
    expect(addresses.find((a) => a.id === a2.id).isDefault).toBe(true);
  });
});
