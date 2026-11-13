import { CatalogService } from './catalog.service';
import type { PartnerContext } from '../partners/partner.guard';

describe('CatalogService', () => {
  let service: CatalogService;
  let categories: any[];
  let products: any[];
  let optionGroups: any[];
  let options: any[];
  let auditLogs: any[];

  const partner: PartnerContext = {
    merchantId: 'merch-1',
    merchantName: 'Pizzaria Top',
    merchantStatus: 'ACTIVE',
    staffRole: 'OWNER',
  };

  beforeEach(() => {
    categories = [];
    products = [];
    optionGroups = [];
    options = [];
    auditLogs = [];

    const mockPrisma: any = {
      menuCategory: {
        findMany: async ({ where }: any) => {
          return categories
            .filter((c) => c.merchantId === where.merchantId)
            .map((c) => ({
              ...c,
              products: products
                .filter((p) => p.menuCategoryId === c.id)
                .map((p) => ({
                  ...p,
                  optionGroups: optionGroups
                    .filter((g) => g.productId === p.id)
                    .map((g) => ({
                      ...g,
                      options: options.filter((o) => o.groupId === g.id),
                    })),
                })),
            }));
        },
        findUnique: async ({ where }: any) => categories.find((c) => c.id === where.id) || null,
        create: async ({ data }: any) => {
          const c = { id: `cat-${categories.length + 1}`, active: true, position: 0, ...data };
          categories.push(c);
          return c;
        },
        update: async ({ where, data }: any) => {
          const c = categories.find((item) => item.id === where.id);
          Object.assign(c, data);
          return c;
        },
        delete: async ({ where }: any) => {
          const idx = categories.findIndex((item) => item.id === where.id);
          if (idx !== -1) categories.splice(idx, 1);
        },
        updateMany: async ({ where, data }: any) => {
          const c = categories.find((item) => item.id === where.id);
          if (c) Object.assign(c, data);
        },
      },
      product: {
        findUnique: async ({ where }: any) => {
          const p = products.find((item) => item.id === where.id);
          if (!p) return null;
          const cat = categories.find((c) => c.id === p.menuCategoryId);
          return { ...p, menuCategory: cat };
        },
        create: async ({ data }: any) => {
          const p = {
            id: `prod-${products.length + 1}`,
            active: true,
            paused: false,
            position: 0,
            ...data,
          };
          products.push(p);
          return p;
        },
        update: async ({ where, data }: any) => {
          const p = products.find((item) => item.id === where.id);
          Object.assign(p, data);
          return p;
        },
        delete: async ({ where }: any) => {
          const idx = products.findIndex((item) => item.id === where.id);
          if (idx !== -1) products.splice(idx, 1);
        },
        count: async ({ where }: any) => {
          return products.filter((p) => p.menuCategoryId === where.menuCategoryId).length;
        },
      },
      productOptionGroup: {
        create: async ({ data }: any) => {
          const g = {
            id: `grp-${optionGroups.length + 1}`,
            productId: data.productId,
            name: data.name,
            required: data.required,
            minSelect: data.minSelect,
            maxSelect: data.maxSelect,
            position: data.position,
            options: [],
          };
          optionGroups.push(g);
          if (data.options?.create) {
            data.options.create.forEach((optData: any) => {
              const opt = { id: `opt-${options.length + 1}`, groupId: g.id, ...optData };
              options.push(opt);
              (g.options as any[]).push(opt);
            });
          }
          return g;
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

    service = new CatalogService(mockPrisma, mockAudit);
  });

  it('deve criar categoria, produto e complementos, e retornar a árvore do cardápio', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };

    // 1. Criar Categoria
    const cat = await service.createCategory(
      partner,
      'usr-1',
      { name: 'Pizzas Salgadas' },
      meta,
    );
    expect(cat.id).toBe('cat-1');

    // 2. Criar Produto
    const prod = await service.createProduct(
      partner,
      'usr-1',
      cat.id,
      {
        name: 'Pizza Margherita',
        basePriceCents: 4500,
        promotionalPriceCents: 3990,
      },
      meta,
    );
    expect(prod.id).toBe('prod-1');

    // 3. Criar Grupo de Complementos com Opções
    const group = await service.createOptionGroup(
      partner,
      'usr-1',
      prod.id,
      {
        name: 'Borda Recheada',
        required: false,
        minSelect: 0,
        maxSelect: 1,
        options: [
          { name: 'Catupiry', priceDeltaCents: 600, active: true },
          { name: 'Cheddar', priceDeltaCents: 500, active: true },
        ],
      },
      meta,
    );
    expect(group.options.length).toBe(2);

    // 4. Buscar árvore completa
    const tree = await service.getMenuTree(partner.merchantId);
    expect(tree.categories.length).toBe(1);
    expect(tree.categories[0].products.length).toBe(1);
    expect(tree.categories[0].products[0].name).toBe('Pizza Margherita');
    expect(tree.categories[0].products[0].optionGroups.length).toBe(1);
    expect(tree.categories[0].products[0].optionGroups[0].options.length).toBe(2);
  });

  it('deve pausar e despausar produto (gestor de pedidos)', async () => {
    const meta = { ip: '127.0.0.1', userAgent: 'test' };
    const cat = await service.createCategory(partner, 'usr-1', { name: 'Bebidas' }, meta);
    const prod = await service.createProduct(
      partner,
      'usr-1',
      cat.id,
      { name: 'Coca-Cola 2L', basePriceCents: 1200 },
      meta,
    );

    const paused = await service.toggleProductPause(partner, 'usr-1', prod.id, meta);
    expect(paused.paused).toBe(true);

    const resumed = await service.toggleProductPause(partner, 'usr-1', prod.id, meta);
    expect(resumed.paused).toBe(false);
  });
});
