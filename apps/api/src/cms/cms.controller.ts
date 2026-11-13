import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CmsPageDto,
  LeadCaptureInput,
  LeadCaptureResponse,
  PlatformStatsDto,
  UpsertCmsPageInput,
} from '@ifastfood/contracts';
import { CmsService } from './cms.service';

@ApiTags('CMS & Institucional')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obtém estatísticas operacionais públicas calculadas do Supabase' })
  @ApiResponse({ status: 200, description: 'Estatísticas de entregas, avaliações e parceiros' })
  async getStats(): Promise<PlatformStatsDto> {
    return this.cmsService.getPlatformStats();
  }

  @Get('pages')
  @ApiOperation({ summary: 'Lista todas as páginas CMS públicas ativas' })
  @ApiResponse({ status: 200, description: 'Lista de páginas publicadas' })
  async listPages(): Promise<CmsPageDto[]> {
    return this.cmsService.listPublishedPages();
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Obtém conteúdo de uma página institucional pelo slug' })
  @ApiResponse({ status: 200, description: 'Conteúdo da página e blocos de seções' })
  @ApiResponse({ status: 404, description: 'Página não encontrada ou despublicada' })
  async getPage(@Param('slug') slug: string): Promise<CmsPageDto> {
    return this.cmsService.getPageBySlug(slug);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Cria ou atualiza uma página institucional (Admin / Seed)' })
  @ApiResponse({ status: 201, description: 'Página salva com sucesso' })
  async upsertPage(@Body() body: UpsertCmsPageInput): Promise<CmsPageDto> {
    return this.cmsService.upsertPage(body);
  }

  @Post('leads')
  @ApiOperation({ summary: 'Captura lead comercial ou de interesse de entregador/restaurante' })
  @ApiResponse({ status: 201, description: 'Lead recebido com sucesso' })
  async captureLead(@Body() body: LeadCaptureInput): Promise<LeadCaptureResponse> {
    return this.cmsService.captureLead(body);
  }
}
