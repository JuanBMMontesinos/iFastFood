/**
 * F2 — Endpoints do Cardápio / Catálogo.
 * Rotas de gestão: protegidas por PartnerGuard (portal do parceiro).
 * Rotas de consulta pública: públicas para clientes.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  MenuCategoryInput,
  MenuCategoryUpdateInput,
  MenuProductInput,
  MenuProductUpdateInput,
  MenuTreeView,
  OptionGroupCreate,
  ReorderInput,
} from '@ifastfood/contracts';
import {
  menuCategoryInputSchema,
  menuCategoryUpdateSchema,
  menuProductInputSchema,
  menuProductUpdateSchema,
  optionGroupCreateSchema,
  reorderSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser, Public } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { requestMeta } from '../identity/http/request-meta';
import { Partner, PartnerGuard, RequireStaffRole, type PartnerContext } from '../partners/partner.guard';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // ---- Consulta Pública do Cardápio ------------------------------------------

  @Get('catalog/merchants/:merchantId/menu')
  @Public()
  getPublicMenuTree(
    @Param('merchantId', new ZodValidationPipe(uuidSchema)) merchantId: string,
  ): Promise<MenuTreeView> {
    return this.catalog.getMenuTree(merchantId, true);
  }

  // ---- Gestão pelo Portal do Parceiro ----------------------------------------

  @UseGuards(PartnerGuard)
  @Get('partners/me/menu/tree')
  getMyMenuTree(@Partner() partner: PartnerContext): Promise<MenuTreeView> {
    return this.catalog.getMenuTree(partner.merchantId, false);
  }

  // ---- Categorias -------------------------------------------------------------

  @UseGuards(PartnerGuard)
  @Post('partners/me/menu/categories')
  @RequireStaffRole('OWNER', 'MANAGER')
  createCategory(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(menuCategoryInputSchema)) body: MenuCategoryInput,
  ) {
    return this.catalog.createCategory(partner, principal.userId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Put('partners/me/menu/categories/reorder')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  reorderCategories(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput,
  ): Promise<void> {
    return this.catalog.reorderCategories(partner, principal.userId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Put('partners/me/menu/categories/:categoryId')
  @RequireStaffRole('OWNER', 'MANAGER')
  updateCategory(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('categoryId', new ZodValidationPipe(uuidSchema)) categoryId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(menuCategoryUpdateSchema)) body: MenuCategoryUpdateInput,
  ) {
    return this.catalog.updateCategory(partner, principal.userId, categoryId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Delete('partners/me/menu/categories/:categoryId')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  deleteCategory(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('categoryId', new ZodValidationPipe(uuidSchema)) categoryId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.catalog.deleteCategory(partner, principal.userId, categoryId, requestMeta(request));
  }

  // ---- Produtos ---------------------------------------------------------------

  @UseGuards(PartnerGuard)
  @Post('partners/me/menu/categories/:categoryId/products')
  @RequireStaffRole('OWNER', 'MANAGER')
  createProduct(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('categoryId', new ZodValidationPipe(uuidSchema)) categoryId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(menuProductInputSchema)) body: MenuProductInput,
  ) {
    return this.catalog.createProduct(partner, principal.userId, categoryId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Put('partners/me/menu/categories/:categoryId/products/reorder')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  reorderProducts(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('categoryId', new ZodValidationPipe(uuidSchema)) categoryId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(reorderSchema)) body: ReorderInput,
  ): Promise<void> {
    return this.catalog.reorderProducts(partner, principal.userId, categoryId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Put('partners/me/menu/products/:productId')
  @RequireStaffRole('OWNER', 'MANAGER')
  updateProduct(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('productId', new ZodValidationPipe(uuidSchema)) productId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(menuProductUpdateSchema)) body: MenuProductUpdateInput,
  ) {
    return this.catalog.updateProduct(partner, principal.userId, productId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Post('partners/me/menu/products/:productId/toggle-pause')
  @RequireStaffRole('OWNER', 'MANAGER', 'OPERATOR')
  toggleProductPause(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('productId', new ZodValidationPipe(uuidSchema)) productId: string,
    @Req() request: Request,
  ) {
    return this.catalog.toggleProductPause(partner, principal.userId, productId, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Delete('partners/me/menu/products/:productId')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  deleteProduct(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('productId', new ZodValidationPipe(uuidSchema)) productId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.catalog.deleteProduct(partner, principal.userId, productId, requestMeta(request));
  }

  // ---- Grupos de Opções / Complementos ----------------------------------------

  @UseGuards(PartnerGuard)
  @Post('partners/me/menu/products/:productId/option-groups')
  @RequireStaffRole('OWNER', 'MANAGER')
  createOptionGroup(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('productId', new ZodValidationPipe(uuidSchema)) productId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(optionGroupCreateSchema)) body: OptionGroupCreate,
  ) {
    return this.catalog.createOptionGroup(partner, principal.userId, productId, body, requestMeta(request));
  }

  @UseGuards(PartnerGuard)
  @Delete('partners/me/menu/option-groups/:groupId')
  @RequireStaffRole('OWNER', 'MANAGER')
  @HttpCode(204)
  deleteOptionGroup(
    @Partner() partner: PartnerContext,
    @CurrentUser() principal: Principal,
    @Param('groupId', new ZodValidationPipe(uuidSchema)) groupId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.catalog.deleteOptionGroup(partner, principal.userId, groupId, requestMeta(request));
  }
}
