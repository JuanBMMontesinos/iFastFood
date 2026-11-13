import { DiscoveryService } from './discovery.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let merchants: any[];

  beforeEach(() => {
    merchants = [
      {
        id: 'm-1',
        name: 'Pizzaria Centro',
        slug: 'pizzaria-centro',
        categoryId: 'cat-pizza',
        status: 'ACTIVE',
        lat: -23.55052,
        lng: -46.633308,
        ratingAvg: 4.8,
        ratingCount: 120,
        orderPrepMinutes: 25,
        category: { id: 'cat-pizza', name: 'Pizza' },
        hours: [
          // Aberto todos os dias
          { weekday: 0, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 1, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 2, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 3, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 4, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 5, openMinutes: 0, closeMinutes: 1440 },
          { weekday: 6, openMinutes: 0, closeMinutes: 1440 },
        ],
        zones: [
          {
            id: 'z-1',
            type: 'RADIUS',
            baseFeeCents: 500,
            perKmCents: 150,
            minFeeCents: 500,
            maxKm: 10,
            minOrderCents: 2000,
            etaMinMinutes: 30,
            etaMaxMinutes: 45,
          },
        ],
      },
      {
        id: 'm-2',
        name: 'Restaurante Distante',
        slug: 'restaurante-distante',
        categoryId: 'cat-brazilian',
        status: 'ACTIVE',
        lat: -23.85052,
        lng: -46.933308,
        ratingAvg: 4.5,
        ratingCount: 50,
        orderPrepMinutes: 30,
        category: { id: 'cat-brazilian', name: 'Brasileira' },
        hours: [],
        zones: [
          {
            id: 'z-2',
            type: 'RADIUS',
            baseFeeCents: 700,
            perKmCents: 200,
            minFeeCents: 700,
            maxKm: 5, // raio pequeno não alcança cliente
            minOrderCents: 3000,
          },
        ],
      },
    ];

    const mockPrisma: any = {
      merchant: {
        findMany: async () => merchants,
        findFirst: async ({ where }: any) => {
          return merchants.find((m) => m.id === where.OR?.[0]?.id || m.slug === where.OR?.[1]?.slug) || null;
        },
      },
    };

    service = new DiscoveryService(mockPrisma);
  });

  it('deve listar apenas lojas cujo raio atende as coordenadas do cliente', async () => {
    // Coordenadas perto do m-1 (Centro de SP)
    const feed = await service.getFeed({
      lat: -23.55152,
      lng: -46.634308,
    });

    expect(feed.length).toBe(1);
    expect(feed[0]!.id).toBe('m-1');
    expect(feed[0]!.isOpen).toBe(true);
    expect(feed[0]!.distanceKm).toBeLessThan(1);
    expect(feed[0]!.deliveryFeeCents).toBe(523); // 500 base + 150 * 0.151km = 523
  });

  it('deve retornar detalhes da loja com estimativa de frete', async () => {
    const detail = await service.getMerchantDetail('pizzaria-centro', {
      lat: -23.55152,
      lng: -46.634308,
    });

    expect(detail.merchant.name).toBe('Pizzaria Centro');
    expect(detail.merchant.isOpen).toBe(true);
    expect(detail.deliveryEstimate).toBeDefined();
    expect(detail.deliveryEstimate!.feeCents).toBe(523);
  });
});
