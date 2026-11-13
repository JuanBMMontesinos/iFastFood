/**
 * F3 — Endpoints do Cliente: perfil e catálogo de endereços.
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
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  AddressInput,
  AddressView,
  CustomerProfileUpdateInput,
  CustomerProfileView,
} from '@ifastfood/contracts';
import {
  addressInputSchema,
  customerProfileUpdateSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { requestMeta } from '../identity/http/request-meta';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get('me')
  getProfile(@CurrentUser() principal: Principal): Promise<CustomerProfileView> {
    return this.customer.getProfile(principal.userId);
  }

  @Put('me')
  @HttpCode(204)
  updateProfile(
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(customerProfileUpdateSchema)) body: CustomerProfileUpdateInput,
  ): Promise<void> {
    return this.customer.updateProfile(principal.userId, body, requestMeta(request));
  }

  @Get('addresses')
  listAddresses(@CurrentUser() principal: Principal): Promise<AddressView[]> {
    return this.customer.listAddresses(principal.userId);
  }

  @Post('addresses')
  createAddress(
    @CurrentUser() principal: Principal,
    @Req() request: Request,
    @Body(new ZodValidationPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.customer.createAddress(principal.userId, body, requestMeta(request));
  }

  @Put('addresses/:addressId')
  updateAddress(
    @CurrentUser() principal: Principal,
    @Param('addressId', new ZodValidationPipe(uuidSchema)) addressId: string,
    @Req() request: Request,
    @Body(new ZodValidationPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.customer.updateAddress(principal.userId, addressId, body, requestMeta(request));
  }

  @Delete('addresses/:addressId')
  @HttpCode(204)
  deleteAddress(
    @CurrentUser() principal: Principal,
    @Param('addressId', new ZodValidationPipe(uuidSchema)) addressId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.customer.deleteAddress(principal.userId, addressId, requestMeta(request));
  }

  @Post('addresses/:addressId/default')
  @HttpCode(204)
  setDefaultAddress(
    @CurrentUser() principal: Principal,
    @Param('addressId', new ZodValidationPipe(uuidSchema)) addressId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.customer.setDefaultAddress(principal.userId, addressId, requestMeta(request));
  }
}
