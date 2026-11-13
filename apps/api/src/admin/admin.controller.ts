import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AdminDashboardMetricsDto,
  KycQueueItemDto,
  ReviewKycInput,
  ReviewKycInputSchema,
} from '@ifastfood/contracts';
import { Public } from '../identity/guards/decorators';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { AdminService } from './admin.service';

@ApiTags('Backoffice Executivo')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public() // Em dev/demonstração permite o backoffice consultar diretamente
  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Obtém métricas executivas agregadas a partir do Supabase' })
  @ApiResponse({ status: 200, description: 'Métricas de GMV, receita, pedidos e parceiros' })
  async getMetrics(): Promise<AdminDashboardMetricsDto> {
    return this.adminService.getDashboardMetrics();
  }

  @Public()
  @Get('kyc/queue')
  @ApiOperation({ summary: 'Retorna a fila unificada de homologação de KYC' })
  @ApiResponse({ status: 200, description: 'Lista de lojistas e entregadores pendentes' })
  async getKycQueue(): Promise<KycQueueItemDto[]> {
    return this.adminService.getKycQueue();
  }

  @Public()
  @Post('kyc/merchant/:id/review')
  @ApiOperation({ summary: 'Aprova ou reprova um restaurante na fila de KYC' })
  async reviewMerchant(
    @Param('id') merchantId: string,
    @Body(new ZodValidationPipe(ReviewKycInputSchema)) body: ReviewKycInput,
  ) {
    return this.adminService.reviewMerchant(merchantId, body);
  }

  @Public()
  @Post('kyc/courier/:id/review')
  @ApiOperation({ summary: 'Aprova ou reprova um entregador na fila de KYC' })
  async reviewCourier(
    @Param('id') courierId: string,
    @Body(new ZodValidationPipe(ReviewKycInputSchema)) body: ReviewKycInput,
  ) {
    return this.adminService.reviewCourier(courierId, body);
  }
}
