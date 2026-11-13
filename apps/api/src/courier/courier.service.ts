import { Injectable } from '@nestjs/common';
import {
  CourierOnboardingInput,
  CourierDocumentUploadInput,
  CourierReviewInput,
  CourierProfile,
} from '@ifastfood/contracts';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourierService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém o perfil do entregador logado (ou provisiona em ONBOARDING caso seja primeiro acesso).
   */
  async getMe(userId: string): Promise<CourierProfile> {
    let courier = await this.prisma.courier.findUnique({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        shifts: {
          where: { endedAt: null },
          take: 1,
        },
      },
    });

    if (!courier) {
      courier = await this.prisma.courier.create({
        data: {
          userId,
          status: 'ONBOARDING',
          vehicleType: 'MOTORCYCLE',
        },
        include: {
          documents: true,
          shifts: true,
        },
      });
    }

    const activeShift = courier.shifts?.[0];

    return {
      id: courier.id,
      userId: courier.userId,
      status: courier.status,
      vehicleType: courier.vehicleType,
      plate: courier.plate,
      ratingAvg: Number(courier.ratingAvg),
      ratingCount: courier.ratingCount,
      isOnline: !!activeShift,
      activeShiftId: activeShift ? activeShift.id : null,
      documents: courier.documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileUrl: d.fileUrl,
        status: d.status,
        rejectReason: d.rejectReason,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Onboarding: preenche tipo de veículo e placa do entregador.
   */
  async onboard(userId: string, input: CourierOnboardingInput) {
    const courier = await this.prisma.courier.upsert({
      where: { userId },
      update: {
        vehicleType: input.vehicleType,
        plate: input.plate,
      },
      create: {
        userId,
        vehicleType: input.vehicleType,
        plate: input.plate,
        status: 'ONBOARDING',
      },
    });

    return courier;
  }

  /**
   * Envio de documento (CNH, CRLV, Selfie, etc.).
   * Se os documentos essenciais (CNH e SELFIE) forem enviados, muda para PENDING_REVIEW.
   */
  async uploadDocument(userId: string, input: CourierDocumentUploadInput) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
      include: { documents: true },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Perfil de entregador não encontrado. Realize o onboarding.');
    }

    const doc = await this.prisma.courierDocument.create({
      data: {
        courierId: courier.id,
        type: input.type,
        fileUrl: input.fileUrl,
        status: 'PENDING',
      },
    });

    const allDocs = [...courier.documents, doc];
    const hasCnh = allDocs.some((d) => d.type === 'CNH');
    const hasSelfie = allDocs.some((d) => d.type === 'SELFIE');

    if (hasCnh && hasSelfie && courier.status === 'ONBOARDING') {
      await this.prisma.courier.update({
        where: { id: courier.id },
        data: { status: 'PENDING_REVIEW' },
      });
    }

    return doc;
  }

  /**
   * Inicia o turno de trabalho (Ficar Online).
   * Fecha automaticamente qualquer turno anterior com mais de 12 horas por segurança.
   */
  async startShift(userId: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    if (courier.status !== 'APPROVED' && courier.status !== 'ACTIVE') {
      throw ApiError.badRequest(
        'CADASTRO_NAO_APROVADO',
        `Cadastro não aprovado para entregas. Status atual: ${courier.status}`,
      );
    }

    // Fechamento de segurança: turnos abertos há mais de 12h
    const staleThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await this.prisma.courierShift.updateMany({
      where: {
        courierId: courier.id,
        endedAt: null,
        startedAt: { lt: staleThreshold },
      },
      data: {
        endedAt: new Date(),
        closedByPlatform: true,
      },
    });

    // Verifica se já existe um turno ativo recente
    let activeShift = await this.prisma.courierShift.findFirst({
      where: {
        courierId: courier.id,
        endedAt: null,
      },
    });

    if (!activeShift) {
      activeShift = await this.prisma.courierShift.create({
        data: {
          courierId: courier.id,
          startedAt: new Date(),
        },
      });
    }

    await this.prisma.courier.update({
      where: { id: courier.id },
      data: { status: 'ACTIVE' },
    });

    return activeShift;
  }

  /**
   * Encerra o turno de trabalho (Ficar Offline).
   */
  async endShift(userId: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    await this.prisma.courierShift.updateMany({
      where: {
        courierId: courier.id,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    await this.prisma.courier.update({
      where: { id: courier.id },
      data: { status: 'APPROVED' },
    });

    return { ok: true, message: 'Turno encerrado. Entregador offline.' };
  }

  /**
   * Análise administrativa / KYC do entregador.
   */
  async reviewCourier(adminUserId: string, courierId: string, input: CourierReviewInput) {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      throw ApiError.notFound('COURIER_NOT_FOUND', 'Entregador não encontrado.');
    }

    const nextStatus =
      input.decision === 'APPROVE'
        ? 'APPROVED'
        : input.decision === 'REJECT'
          ? 'ONBOARDING'
          : input.decision === 'SUSPEND'
            ? 'SUSPENDED'
            : 'BLOCKED';

    const updated = await this.prisma.courier.update({
      where: { id: courierId },
      data: {
        status: nextStatus,
      },
    });

    if (input.decision === 'APPROVE') {
      await this.prisma.courierDocument.updateMany({
        where: { courierId, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
        },
      });
    } else if (input.decision === 'REJECT') {
      await this.prisma.courierDocument.updateMany({
        where: { courierId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          rejectReason: input.rejectReason ?? 'Documentação inconsistente',
        },
      });
    }

    return updated;
  }
}
