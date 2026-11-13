import { Injectable, Logger } from '@nestjs/common';
import {
  CmsPageDto,
  UpsertCmsPageInput,
  LeadCaptureInput,
  LeadCaptureResponse,
} from '@ifastfood/contracts';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/api-error';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca página CMS publicada pelo slug.
   */
  async getPageBySlug(slug: string): Promise<CmsPageDto> {
    const page = await this.prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page || !page.published) {
      throw ApiError.notFound('PAGE_NOT_FOUND', `Página institucional '${slug}' não encontrada ou inativa.`);
    }

    return {
      slug: page.slug,
      title: page.title,
      sections: page.sections as any,
      published: page.published,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * Lista todas as páginas públicas ativas.
   */
  async listPublishedPages(): Promise<CmsPageDto[]> {
    const pages = await this.prisma.cmsPage.findMany({
      where: { published: true },
      orderBy: { title: 'asc' },
    });

    return pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      sections: p.sections as any,
      published: p.published,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Cria ou atualiza página CMS (Backoffice / Seed).
   */
  async upsertPage(input: UpsertCmsPageInput): Promise<CmsPageDto> {
    const page = await this.prisma.cmsPage.upsert({
      where: { slug: input.slug },
      update: {
        title: input.title,
        sections: input.sections as any,
        published: input.published ?? true,
        publishedAt: input.published ? new Date() : null,
      },
      create: {
        slug: input.slug,
        title: input.title,
        sections: input.sections as any,
        published: input.published ?? true,
        publishedAt: input.published ? new Date() : null,
      },
    });

    return {
      slug: page.slug,
      title: page.title,
      sections: page.sections as any,
      published: page.published,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  /**
   * Captura leads originados da landing page institucional.
   */
  async captureLead(input: LeadCaptureInput): Promise<LeadCaptureResponse> {
    const leadId = randomUUID();
    this.logger.log(
      `Novo lead capturado [${input.type}]: ${input.name} <${input.email}> (${input.city ?? 'N/D'}) - id: ${leadId}`,
    );

    return {
      success: true,
      leadId,
      message: 'Obrigado pelo seu interesse! Nossa equipe de expansão entrará em contato em breve.',
    };
  }
}
