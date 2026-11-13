import { CmsService } from './cms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CmsService', () => {
  let service: CmsService;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      cmsPage: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      } as any,
      order: {
        count: jest.fn(),
        findFirst: jest.fn(),
      } as any,
      merchant: {
        count: jest.fn(),
      } as any,
      courier: {
        count: jest.fn(),
      } as any,
      rating: {
        aggregate: jest.fn(),
      } as any,
    };
    service = new CmsService(prisma as PrismaService);
  });

  it('deve retornar página encontrada e publicada', async () => {
    (prisma.cmsPage!.findUnique as any).mockResolvedValue({
      slug: 'sobre-nos',
      title: 'Sobre Nós',
      sections: [{ id: '1', type: 'hero', title: 'Nossa História' }],
      published: true,
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const page = await service.getPageBySlug('sobre-nos');
    expect(page.slug).toBe('sobre-nos');
    expect(page.title).toBe('Sobre Nós');
    expect(page.published).toBe(true);
    expect(page.sections).toHaveLength(1);
  });

  it('deve lançar 404 quando a página não existir ou for despublicada', async () => {
    (prisma.cmsPage!.findUnique as any).mockResolvedValue(null);

    await expect(service.getPageBySlug('inexistente')).rejects.toThrow();
  });

  it('deve listar páginas publicadas', async () => {
    (prisma.cmsPage!.findMany as any).mockResolvedValue([
      {
        slug: 'termos',
        title: 'Termos de Uso',
        sections: [],
        published: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const list = await service.listPublishedPages();
    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe('termos');
  });

  it('deve realizar upsert de página com sucesso', async () => {
    (prisma.cmsPage!.upsert as any).mockResolvedValue({
      slug: 'privacidade',
      title: 'Privacidade',
      sections: [],
      published: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.upsertPage({
      slug: 'privacidade',
      title: 'Privacidade',
      sections: [],
      published: true,
    });

    expect(result.slug).toBe('privacidade');
    expect(prisma.cmsPage!.upsert).toHaveBeenCalled();
  });

  it('deve capturar lead com sucesso e retornar ID', async () => {
    const res = await service.captureLead({
      name: 'Restaurante Teste',
      email: 'contato@teste.com',
      phone: '11999999999',
      type: 'MERCHANT',
      city: 'São Paulo',
    });

    expect(res.success).toBe(true);
    expect(res.leadId).toBeDefined();
    expect(res.message).toContain('equipe de expansão');
  });

  it('deve retornar estatísticas públicas agregadas com showcase do Supabase', async () => {
    (prisma.order!.count as any).mockResolvedValue(12);
    (prisma.merchant!.count as any).mockResolvedValue(8);
    (prisma.courier!.count as any).mockResolvedValue(5);
    (prisma.rating!.aggregate as any).mockResolvedValue({
      _avg: { merchantRating: 4.9 },
    });
    (prisma.order!.findFirst as any).mockResolvedValue({
      id: 'ord-1',
      items: [{ productName: 'Pizza Calabresa' }],
      merchant: { name: 'Pizzaria Bella Napoli' },
      paymentMethod: 'CARD_CREDIT',
      status: 'DELIVERED',
      delivery: {
        distanceKm: 2.5,
        courier: {
          vehicleType: 'MOTORCYCLE',
          plate: 'XYZ-1234',
          user: { name: 'Carlos Eduardo' },
        },
      },
    });

    const stats = await service.getPlatformStats();
    expect(stats.deliveredOrdersCount).toBe(12);
    expect(stats.activeMerchantsCount).toBe(8);
    expect(stats.activeCouriersCount).toBe(5);
    expect(stats.averageRating).toBe(4.9);
    expect(stats.showcaseDelivery).toBeDefined();
    expect(stats.showcaseDelivery?.productName).toBe('Pizza Calabresa');
    expect(stats.showcaseDelivery?.merchantName).toBe('Pizzaria Bella Napoli');
  });
});
