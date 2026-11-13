/**
 * F2 — Catálogo de produtos e cardápio: categorias, itens, complementos e árvore.
 * Todas as mutações são escopadas pela loja do parceiro (PartnerContext).
 */
import { Injectable } from '@nestjs/common';
import type {
  MenuCategoryInput,
  MenuCategoryUpdateInput,
  MenuProductInput,
  MenuProductUpdateInput,
  MenuTreeView,
  OptionGroupCreate,
  ReorderInput,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../identity/services/audit.service';
import type { RequestMeta } from '../identity/types';
import type { PartnerContext } from '../partners/partner.guard';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Árvore do cardápio completa (para gestão do parceiro ou pública para cliente). */
  async getMenuTree(merchantId: string, publicOnly = false): Promise<MenuTreeView> {
    const categories = await this.prisma.menuCategory.findMany({
      where: {
        merchantId,
        ...(publicOnly ? { active: true } : {}),
      },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: publicOnly ? { active: true } : {},
          orderBy: { position: 'asc' },
          include: {
            optionGroups: {
              orderBy: { position: 'asc' },
              include: {
                options: {
                  where: publicOnly ? { active: true } : {},
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        active: cat.active,
        position: cat.position,
        products: cat.products.map((prod) => ({
          id: prod.id,
          name: prod.name,
          description: prod.description,
          basePriceCents: prod.basePriceCents,
          promotionalPriceCents: prod.promotionalPriceCents,
          imageUrl: prod.imageUrl,
          active: prod.active,
          paused: prod.paused,
          isFeatured: prod.isFeatured,
          position: prod.position,
          optionGroups: prod.optionGroups.map((group) => ({
            id: group.id,
            name: group.name,
            required: group.required,
            minSelect: group.minSelect,
            maxSelect: group.maxSelect,
            position: group.position,
            options: group.options.map((opt) => ({
              id: opt.id,
              name: opt.name,
              priceDeltaCents: opt.priceDeltaCents,
              active: opt.active,
              position: opt.position,
            })),
          })),
        })),
      })),
    };
  }

  // ---- Categorias -----------------------------------------------------------

  async createCategory(
    partner: PartnerContext,
    userId: string,
    input: MenuCategoryInput,
    meta: RequestMeta,
  ) {
    const category = await this.prisma.menuCategory.create({
      data: {
        merchantId: partner.merchantId,
        name: input.name,
        description: input.description,
        position: input.position ?? 0,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'CARDAPIO_CATEGORIA_CRIADA',
      resourceType: 'MenuCategory',
      resourceId: category.id,
      payload: { name: category.name },
      meta,
    });

    return category;
  }

  async updateCategory(
    partner: PartnerContext,
    userId: string,
    categoryId: string,
    input: MenuCategoryUpdateInput,
    meta: RequestMeta,
  ) {
    const existing = await this.getScopedCategory(partner.merchantId, categoryId);
    const category = await this.prisma.menuCategory.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        description: input.description,
        position: input.position,
        active: input.active,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'CARDAPIO_CATEGORIA_ATUALIZADA',
      resourceType: 'MenuCategory',
      resourceId: category.id,
      meta,
    });

    return category;
  }

  async deleteCategory(
    partner: PartnerContext,
    userId: string,
    categoryId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const existing = await this.getScopedCategory(partner.merchantId, categoryId);
    const productsCount = await this.prisma.product.count({
      where: { menuCategoryId: existing.id },
    });
    if (productsCount > 0) {
      throw ApiError.conflict(
        'CATEGORIA_COM_PRODUTOS',
        'Não é possível excluir categoria com produtos vinculados',
      );
    }

    await this.prisma.menuCategory.delete({ where: { id: existing.id } });
    await this.audit.log({
      actorUserId: userId,
      action: 'CARDAPIO_CATEGORIA_EXCLUIDA',
      resourceType: 'MenuCategory',
      resourceId: existing.id,
      meta,
    });
  }

  async reorderCategories(
    partner: PartnerContext,
    userId: string,
    input: ReorderInput,
    meta: RequestMeta,
  ): Promise<void> {
    await this.prisma.$transaction(
      input.ids.map((id, index) =>
        this.prisma.menuCategory.updateMany({
          where: { id, merchantId: partner.merchantId },
          data: { position: index },
        }),
      ),
    );

    await this.audit.log({
      actorUserId: userId,
      action: 'CARDAPIO_CATEGORIAS_REORDENADAS',
      resourceType: 'Merchant',
      resourceId: partner.merchantId,
      payload: { count: input.ids.length },
      meta,
    });
  }

  // ---- Produtos -------------------------------------------------------------

  async createProduct(
    partner: PartnerContext,
    userId: string,
    categoryId: string,
    input: MenuProductInput,
    meta: RequestMeta,
  ) {
    await this.getScopedCategory(partner.merchantId, categoryId);

    const product = await this.prisma.product.create({
      data: {
        menuCategoryId: categoryId,
        name: input.name,
        description: input.description,
        basePriceCents: input.basePriceCents,
        promotionalPriceCents: input.promotionalPriceCents,
        imageUrl: input.imageUrl,
        isFeatured: input.isFeatured ?? false,
        position: input.position ?? 0,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'PRODUTO_CRIADO',
      resourceType: 'Product',
      resourceId: product.id,
      payload: { name: product.name, basePriceCents: product.basePriceCents },
      meta,
    });

    return product;
  }

  async updateProduct(
    partner: PartnerContext,
    userId: string,
    productId: string,
    input: MenuProductUpdateInput,
    meta: RequestMeta,
  ) {
    const existing = await this.getScopedProduct(partner.merchantId, productId);

    if (input.menuCategoryId && input.menuCategoryId !== existing.menuCategoryId) {
      await this.getScopedCategory(partner.merchantId, input.menuCategoryId);
    }

    const newBase = input.basePriceCents ?? existing.basePriceCents;
    const newPromo =
      input.promotionalPriceCents !== undefined
        ? input.promotionalPriceCents
        : existing.promotionalPriceCents;

    if (newPromo !== null && newPromo !== undefined && newPromo >= newBase) {
      throw ApiError.badRequest(
        'PRECO_PROMOCIONAL_INVALIDO',
        'Preço promocional deve ser MENOR que o preço base',
      );
    }

    const product = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        menuCategoryId: input.menuCategoryId,
        name: input.name,
        description: input.description,
        basePriceCents: input.basePriceCents,
        promotionalPriceCents: input.promotionalPriceCents,
        imageUrl: input.imageUrl,
        active: input.active,
        paused: input.paused,
        isFeatured: input.isFeatured,
        position: input.position,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'PRODUTO_ATUALIZADO',
      resourceType: 'Product',
      resourceId: product.id,
      meta,
    });

    return product;
  }

  async toggleProductPause(
    partner: PartnerContext,
    userId: string,
    productId: string,
    meta: RequestMeta,
  ) {
    const existing = await this.getScopedProduct(partner.merchantId, productId);
    const paused = !existing.paused;
    const product = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        paused,
        pausedAt: paused ? new Date() : null,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: paused ? 'PRODUTO_PAUSADO' : 'PRODUTO_DESPAUSADO',
      resourceType: 'Product',
      resourceId: product.id,
      meta,
    });

    return product;
  }

  async deleteProduct(
    partner: PartnerContext,
    userId: string,
    productId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const existing = await this.getScopedProduct(partner.merchantId, productId);

    await this.prisma.$transaction(async (tx) => {
      // Deletar opções e grupos de opções
      const groups = await tx.productOptionGroup.findMany({
        where: { productId: existing.id },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);

      if (groupIds.length > 0) {
        await tx.productOption.deleteMany({ where: { groupId: { in: groupIds } } });
        await tx.productOptionGroup.deleteMany({ where: { productId: existing.id } });
      }

      await tx.product.delete({ where: { id: existing.id } });
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'PRODUTO_EXCLUIDO',
      resourceType: 'Product',
      resourceId: existing.id,
      meta,
    });
  }

  async reorderProducts(
    partner: PartnerContext,
    userId: string,
    categoryId: string,
    input: ReorderInput,
    meta: RequestMeta,
  ): Promise<void> {
    await this.getScopedCategory(partner.merchantId, categoryId);

    await this.prisma.$transaction(
      input.ids.map((id, index) =>
        this.prisma.product.updateMany({
          where: { id, menuCategoryId: categoryId },
          data: { position: index },
        }),
      ),
    );

    await this.audit.log({
      actorUserId: userId,
      action: 'CARDAPIO_PRODUTOS_REORDENADOS',
      resourceType: 'MenuCategory',
      resourceId: categoryId,
      payload: { count: input.ids.length },
      meta,
    });
  }

  // ---- Grupos de Opções / Complementos ----------------------------------------

  async createOptionGroup(
    partner: PartnerContext,
    userId: string,
    productId: string,
    input: OptionGroupCreate,
    meta: RequestMeta,
  ) {
    const product = await this.getScopedProduct(partner.merchantId, productId);

    const group = await this.prisma.productOptionGroup.create({
      data: {
        productId: product.id,
        name: input.name,
        required: input.required,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        position: input.position ?? 0,
        options: {
          create: input.options.map((opt, idx) => ({
            name: opt.name,
            priceDeltaCents: opt.priceDeltaCents,
            active: opt.active,
            position: opt.position ?? idx,
          })),
        },
      },
      include: { options: true },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'GRUPO_COMPLEMENTOS_CRIADO',
      resourceType: 'ProductOptionGroup',
      resourceId: group.id,
      payload: { name: group.name, optionsCount: input.options.length },
      meta,
    });

    return group;
  }

  async deleteOptionGroup(
    partner: PartnerContext,
    userId: string,
    groupId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const group = await this.prisma.productOptionGroup.findUnique({
      where: { id: groupId },
      include: { product: { include: { menuCategory: true } } },
    });

    if (!group || group.product.menuCategory.merchantId !== partner.merchantId) {
      throw ApiError.notFound('GRUPO_NAO_ENCONTRADO', 'Grupo de complementos não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productOption.deleteMany({ where: { groupId: group.id } });
      await tx.productOptionGroup.delete({ where: { id: group.id } });
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'GRUPO_COMPLEMENTOS_EXCLUIDO',
      resourceType: 'ProductOptionGroup',
      resourceId: group.id,
      meta,
    });
  }

  // ---- Helpers de escopo -----------------------------------------------------

  private async getScopedCategory(merchantId: string, categoryId: string) {
    const cat = await this.prisma.menuCategory.findUnique({ where: { id: categoryId } });
    if (!cat || cat.merchantId !== merchantId) {
      throw ApiError.notFound('CATEGORIA_NAO_ENCONTRADA', 'Categoria não encontrada nesta loja');
    }
    return cat;
  }

  private async getScopedProduct(merchantId: string, productId: string) {
    const prod = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { menuCategory: true },
    });
    if (!prod || prod.menuCategory.merchantId !== merchantId) {
      throw ApiError.notFound('PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado nesta loja');
    }
    return prod;
  }
}
