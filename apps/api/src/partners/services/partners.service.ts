/**
 * F2 — Parceiros: cadastro, perfil, horários e áreas de entrega.
 * Todo acesso é escopado pelo membership do MerchantStaff, resolvido
 * pelo PartnerGuard (request.partner) — nunca confie no client.
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  assertKycApproved,
  isOpenNow,
  timeToMinutes,
  type BusinessWindow,
} from '@ifastfood/domain';
import type {
  BusinessHoursSetInput,
  DeliveryZoneInput,
  MerchantProfileUpdateInput,
  MerchantSignupInput,
  PartnerProfile,
} from '@ifastfood/contracts';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../identity/services/audit.service';
import { FieldCipher } from '../../identity/crypto/field-cipher';
import { PasswordService } from '../../identity/crypto/password.service';
import { SessionService } from '../../identity/services/session.service';
import type { RequestMeta } from '../../identity/types';
import { LGPD_TERMS_VERSION } from '../../identity/config';
import type { PartnerContext } from '../partner.guard';

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'loja'
  );
}

/** 'HH:mm' → minutos; '00:00' como fechamento passa a 1440 (fim do dia). */
function windowMinutes(open: string, close: string): { openMinutes: number; closeMinutes: number } {
  const o = timeToMinutes(open);
  const c = timeToMinutes(close);
  return { openMinutes: o, closeMinutes: c === 0 ? 1440 : c };
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly cipher: FieldCipher,
  ) {}

  /** Cadastro público: usuário STAFF + loja ONBOARDING + vínculo OWNER. */
  async signup(input: MerchantSignupInput, meta: RequestMeta) {
    const email = input.email.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone: input.phone }] },
      select: { email: true },
    });
    if (clash) {
      throw ApiError.conflict(
        'DADOS_EM_USO',
        clash.email === email ? 'E-mail já cadastrado' : 'Telefone já cadastrado',
      );
    }

    const category = await this.prisma.merchantCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw ApiError.badRequest('CATEGORIA_INEXISTENTE', 'Categoria de loja inválida');
    }

    // slug único p/ URL pública (ex.: pizzaria-do-joao → pizzaria-do-joao-2)
    const base = slugify(input.merchantName);
    let slug = base;
    for (let n = 2; (await this.prisma.merchant.findUnique({ where: { slug } })) !== null; n++) {
      slug = `${base}-${n}`;
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.ownerName,
        email,
        phone: input.phone,
        passwordHash: await this.passwords.hash(input.password),
        userType: 'MERCHANT_STAFF',
        status: 'ACTIVE',
        consents: {
          create: [{ type: 'LGPD_TERMS', version: LGPD_TERMS_VERSION, granted: true }],
        },
      },
    });

    const merchant = await this.prisma.merchant.create({
      data: {
        slug,
        name: input.merchantName,
        categoryId: input.categoryId,
        status: 'ONBOARDING',
        documentEncrypted: this.cipher.encrypt(input.cnpj),
        description: input.description,
        staff: { create: { userId: user.id, role: 'OWNER' } },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'PARCEIRO_CRIADO',
      resourceType: 'Merchant',
      resourceId: merchant.id,
      payload: { slug: merchant.slug, category: category.slug },
      meta,
    });

    const tokens = await this.sessions.createForLogin(user.id, meta);
    return { ...tokens, merchantId: merchant.id, status: merchant.status };
  }

  /** Perfil completo do parceiro: loja + contrato + resumo de KYC. */
  async myProfile(principal: { userId: string }): Promise<PartnerProfile> {
    const membership = await this.prisma.merchantStaff.findFirst({
      where: { userId: principal.userId },
      orderBy: { createdAt: 'asc' },
      include: {
        merchant: {
          include: {
            contract: true,
            documents: { orderBy: [{ createdAt: 'desc' }, { type: 'asc' }] },
          },
        },
      },
    });
    if (!membership) throw ApiError.forbidden('Usuário sem loja vinculada', 'SEM_LOJA');
    const { merchant } = membership;
    const docs = merchant.documents.map((d) => ({
      type: d.type,
      fileUrl: d.fileUrl,
      status: d.status,
      rejectReason: d.rejectReason,
      reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
    }));

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        categoryId: merchant.categoryId,
        status: merchant.status,
        description: merchant.description,
        email: merchant.email,
        phone: merchant.phone,
        logoUrl: merchant.logoUrl,
        coverUrl: merchant.coverUrl,
        orderPrepMinutes: merchant.orderPrepMinutes,
        address:
          merchant.street && merchant.city
            ? {
                street: merchant.street,
                number: merchant.number,
                complement: merchant.complement,
                district: merchant.district,
                city: merchant.city,
                state: merchant.state,
                zipCode: merchant.zipCode,
                lat: merchant.lat === null ? null : Number(merchant.lat),
                lng: merchant.lng === null ? null : Number(merchant.lng),
              }
            : null,
      },
      contract: merchant.contract
        ? {
            plan: merchant.contract.plan,
            commissionBps: merchant.contract.commissionBps,
            onlinePaymentFeeBps: merchant.contract.onlinePaymentFeeBps,
            monthlyFeeCents: merchant.contract.monthlyFeeCents,
            feeFreeThresholdCents: merchant.contract.feeFreeThresholdCents,
            commissionBasis: merchant.contract.commissionBasis,
            signedAt: merchant.contract.signedAt.toISOString(),
          }
        : null,
      staffRole: membership.role,
      kyc: {
        submitted: docs,
        complete: assertKycApprovedSafe(docs),
      },
    };
  }

  /** Atualiza perfil (campos presentes apenas); address é cadeia única. */
  async updateProfile(
    partner: PartnerContext,
    userId: string,
    input: MerchantProfileUpdateInput,
    meta: RequestMeta,
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    const scalars: Partial<MerchantProfileUpdateInput> = input;
    for (const key of ['merchantName', 'categoryId', 'description', 'email', 'phone', 'logoUrl', 'coverUrl', 'orderPrepMinutes'] as const) {
      const value = scalars[key];
      if (value !== undefined) {
        data[key === 'merchantName' ? 'name' : key] = value;
      }
    }
    if (input.address) {
      const a = input.address;
      Object.assign(data, {
        street: a.street,
        number: a.number,
        complement: a.complement ?? null,
        district: a.district,
        city: a.city,
        state: a.state,
        zipCode: a.zipCode.replace(/-/g, ''),
        lat: a.lat,
        lng: a.lng,
      });
    }
    await this.prisma.merchant.update({ where: { id: partner.merchantId }, data });
    await this.audit.log({
      actorUserId: userId,
      action: 'PARCEIRO_PERFIL_ATUALIZADO',
      resourceType: 'Merchant',
      resourceId: partner.merchantId,
      meta,
    });
  }

  /** Substitui TODAS as janelas semanais (operação atômica). */
  async setHours(
    partner: PartnerContext,
    userId: string,
    input: BusinessHoursSetInput,
    meta: RequestMeta,
  ): Promise<void> {
    const windows = input.hours
      .map((h) => ({ ...windowMinutes(h.open, h.close), ...h }))
      .map((w) => ({
        merchantId: partner.merchantId,
        weekday: w.weekday,
        openMinutes: w.openMinutes,
        closeMinutes: w.closeMinutes,
      }));

    await this.prisma.$transaction(async (tx) => {
      await tx.businessHour.deleteMany({ where: { merchantId: partner.merchantId } });
      await tx.businessHour.createMany({ data: windows });
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'HORARIOS_ATUALIZADOS',
      resourceType: 'Merchant',
      resourceId: partner.merchantId,
      payload: { windows: windows.length },
      meta,
    });
  }

  async listHours(merchantId: string): Promise<BusinessWindow[]> {
    const rows = await this.prisma.businessHour.findMany({
      where: { merchantId },
      orderBy: [{ weekday: 'asc' }, { openMinutes: 'asc' }],
    });
    return rows.map((h) => ({
      weekday: h.weekday,
      openMinutes: h.openMinutes,
      closeMinutes: h.closeMinutes,
    }));
  }

  /** Badge 'aberto agora' — fuso America/Sao_Paulo. */
  async isOpenNow(merchantId: string): Promise<boolean> {
    const windows = await this.listHours(merchantId);
    if (windows.length === 0) return false;

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    }).formatToParts(new Date());
    const weekday = WEEKDAY_INDEX[parts.find((p) => p.type === 'weekday')?.value ?? ''] ?? 0;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return isOpenNow(windows, weekday, hour * 60 + minute);
  }

  // ---- Áreas de entrega -------------------------------------------------------

  async createZone(
    partner: PartnerContext,
    userId: string,
    input: DeliveryZoneInput,
    meta: RequestMeta,
  ) {
    const zone = await this.prisma.deliveryZone.create({ data: this.zoneData(partner.merchantId, input) });
    await this.audit.log({
      actorUserId: userId,
      action: 'ZONA_CRIADA',
      resourceType: 'DeliveryZone',
      resourceId: zone.id,
      payload: { merchantId: partner.merchantId, name: zone.name },
      meta,
    });
    return zone;
  }

  async updateZone(
    partner: PartnerContext,
    userId: string,
    zoneId: string,
    input: DeliveryZoneInput,
    meta: RequestMeta,
  ) {
    const existing = await this.getScopedZone(partner.merchantId, zoneId);
    const zone = await this.prisma.deliveryZone.update({
      where: { id: existing.id },
      data: this.zoneData(partner.merchantId, input),
    });
    await this.audit.log({
      actorUserId: userId,
      action: 'ZONA_ATUALIZADA',
      resourceType: 'DeliveryZone',
      resourceId: zone.id,
      meta,
    });
    return zone;
  }

  async deleteZone(
    partner: PartnerContext,
    userId: string,
    zoneId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const existing = await this.getScopedZone(partner.merchantId, zoneId);
    await this.prisma.deliveryZone.delete({ where: { id: existing.id } });
    await this.audit.log({
      actorUserId: userId,
      action: 'ZONA_REMOVIDA',
      resourceType: 'DeliveryZone',
      resourceId: existing.id,
      meta,
    });
  }

  private zoneData(merchantId: string, input: DeliveryZoneInput): Prisma.DeliveryZoneUncheckedCreateInput {
    return {
      merchantId,
      name: input.name,
      type: input.type,
      baseFeeCents: input.baseFeeCents,
      perKmCents: input.perKmCents,
      minFeeCents: input.minFeeCents,
      maxKm: input.maxKm,
      minOrderCents: input.minOrderCents,
      etaMinMinutes: input.etaMinMinutes,
      etaMaxMinutes: input.etaMaxMinutes,
      polygon:
        input.polygon === undefined
          ? undefined
          : (input.polygon as unknown as Prisma.InputJsonValue),
    };
  }

  private async getScopedZone(merchantId: string, zoneId: string) {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id: zoneId } });
    if (!zone || zone.merchantId !== merchantId) {
      throw ApiError.notFound('ZONA_NAO_ENCONTRADA', 'Área de entrega não encontrada');
    }
    return zone;
  }
}

/** Versão não-lançável do gate de KYC (para flags de UI). */
function assertKycApprovedSafe(documents: Array<{ type: string; status: string }>): boolean {
  try {
    assertKycApproved(documents);
    return true;
  } catch {
    return false;
  }
}
