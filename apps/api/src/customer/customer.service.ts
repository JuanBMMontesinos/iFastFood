/**
 * F3 — Gestão de Cliente: perfil e catálogo de endereços de entrega.
 */
import { Injectable } from '@nestjs/common';
import type {
  AddressInput,
  AddressView,
  CustomerProfileUpdateInput,
  CustomerProfileView,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../identity/services/audit.service';
import type { RequestMeta } from '../identity/types';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Obtém ou cria registro de Customer associado ao usuário logado. */
  async getOrCreateCustomer(userId: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: {
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!customer) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw ApiError.unauthorized('Usuário não encontrado', 'USUARIO_INEXISTENTE');
      }
      customer = await this.prisma.customer.create({
        data: { userId },
        include: {
          addresses: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    }

    return customer;
  }

  async getProfile(userId: string): Promise<CustomerProfileView> {
    const customer = await this.getOrCreateCustomer(userId);
    return {
      id: customer.id,
      userId: customer.userId,
      name: customer.user.name,
      email: customer.user.email ?? '',
      phone: customer.user.phone,
      addresses: customer.addresses.map((a) => this.mapAddress(a)),
    };
  }

  async updateProfile(
    userId: string,
    input: CustomerProfileUpdateInput,
    meta: RequestMeta,
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'CLIENTE_PERFIL_ATUALIZADO',
      resourceType: 'User',
      resourceId: userId,
      meta,
    });
  }

  async listAddresses(userId: string): Promise<AddressView[]> {
    const customer = await this.getOrCreateCustomer(userId);
    return customer.addresses.map((a) => this.mapAddress(a));
  }

  async createAddress(
    userId: string,
    input: AddressInput,
    meta: RequestMeta,
  ): Promise<AddressView> {
    const customer = await this.getOrCreateCustomer(userId);

    if (input.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    } else {
      // Se for o primeiro endereço, torna padrão automaticamente
      const count = await this.prisma.address.count({ where: { customerId: customer.id } });
      if (count === 0) {
        input.isDefault = true;
      }
    }

    const address = await this.prisma.address.create({
      data: {
        customerId: customer.id,
        label: input.label,
        street: input.street,
        number: input.number,
        complement: input.complement,
        district: input.district,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        lat: input.lat,
        lng: input.lng,
        isDefault: input.isDefault ?? false,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'ENDERECO_CRIADO',
      resourceType: 'Address',
      resourceId: address.id,
      meta,
    });

    return this.mapAddress(address);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: AddressInput,
    meta: RequestMeta,
  ): Promise<AddressView> {
    const customer = await this.getOrCreateCustomer(userId);
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!existing || existing.customerId !== customer.id) {
      throw ApiError.notFound('ENDERECO_NAO_ENCONTRADO', 'Endereço não encontrado');
    }

    if (input.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        label: input.label,
        street: input.street,
        number: input.number,
        complement: input.complement,
        district: input.district,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        lat: input.lat,
        lng: input.lng,
        isDefault: input.isDefault,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'ENDERECO_ATUALIZADO',
      resourceType: 'Address',
      resourceId: addressId,
      meta,
    });

    return this.mapAddress(updated);
  }

  async deleteAddress(userId: string, addressId: string, meta: RequestMeta): Promise<void> {
    const customer = await this.getOrCreateCustomer(userId);
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!existing || existing.customerId !== customer.id) {
      throw ApiError.notFound('ENDERECO_NAO_ENCONTRADO', 'Endereço não encontrado');
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    await this.audit.log({
      actorUserId: userId,
      action: 'ENDERECO_EXCLUIDO',
      resourceType: 'Address',
      resourceId: addressId,
      meta,
    });
  }

  async setDefaultAddress(userId: string, addressId: string, meta: RequestMeta): Promise<void> {
    const customer = await this.getOrCreateCustomer(userId);
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!existing || existing.customerId !== customer.id) {
      throw ApiError.notFound('ENDERECO_NAO_ENCONTRADO', 'Endereço não encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    await this.audit.log({
      actorUserId: userId,
      action: 'ENDERECO_PADRAO_DEFINIDO',
      resourceType: 'Address',
      resourceId: addressId,
      meta,
    });
  }

  private mapAddress(a: any): AddressView {
    return {
      id: a.id,
      label: a.label,
      street: a.street,
      number: a.number,
      complement: a.complement,
      district: a.district,
      city: a.city,
      state: a.state,
      zipCode: a.zipCode,
      lat: Number(a.lat),
      lng: Number(a.lng),
      isDefault: a.isDefault,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
