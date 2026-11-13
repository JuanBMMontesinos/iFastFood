/**
 * F3 — Endpoints de Pedidos (Checkout, Gestor de Pedidos e Linha do Tempo).
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  OrderCheckoutInput,
  OrderCheckoutResponse,
  OrderDetailView,
  OrderStatusActionInput,
} from '@ifastfood/contracts';
import {
  orderCheckoutInputSchema,
  orderStatusActionSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { requestMeta } from '../identity/http/request-meta';
import { RateLimiterService } from '../identity/security/rate-limiter.service';
import { Partner, PartnerGuard, RequireStaffRole, type PartnerContext } from '../partners/partner.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly limiter: RateLimiterService,
  ) {}

  @Post('checkout')
  checkout(
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(orderCheckoutInputSchema)) body: OrderCheckoutInput,
  ): Promise<OrderCheckoutResponse> {
    this.limiter.consume(`order-checkout:${principal.userId}`, 5, 60 * 1000);
    return this.orders.checkout(principal.userId, body, requestMeta(request));
  }

  @Get('me')
  myOrders(@CurrentUser() principal: Principal): Promise<OrderDetailView[]> {
    return this.orders.getMyOrders(principal.userId);
  }

  @Get(':id')
  orderDetail(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) orderId: string,
  ): Promise<OrderDetailView> {
    return this.orders.getOrderById(orderId, principal);
  }

  @Post(':id/action')
  customerAction(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) orderId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(orderStatusActionSchema)) body: OrderStatusActionInput,
  ) {
    return this.orders.statusAction(
      orderId,
      body,
      { type: 'CUSTOMER', userId: principal.userId },
      requestMeta(request),
    );
  }
}

@UseGuards(PartnerGuard)
@Controller('partners/me/orders')
export class PartnerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Gestor de Pedidos: lista pedidos pendentes e em preparo da loja. */
  @Get()
  listActiveOrders(@Partner() partner: PartnerContext): Promise<OrderDetailView[]> {
    return this.orders.getMerchantOrders(partner);
  }

  /** Gestor de Pedidos: aceite, preparo, pronto para coleta, despacho, cancelamento. */
  @Post(':id/action')
  @RequireStaffRole('OWNER', 'MANAGER', 'OPERATOR')
  statusAction(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) orderId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(orderStatusActionSchema)) body: OrderStatusActionInput,
  ) {
    return this.orders.statusAction(
      orderId,
      body,
      { type: 'MERCHANT', userId: principal.userId },
      requestMeta(request),
    );
  }
}
