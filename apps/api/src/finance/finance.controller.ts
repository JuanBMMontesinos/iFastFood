import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  TriggerPayoutInput,
  triggerPayoutInputSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser, RequirePermissions } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('partners/me/payouts')
  getPartnerPayouts(@CurrentUser() principal: Principal) {
    return this.financeService.getMerchantPayouts(principal.userId);
  }

  @Get('couriers/me/earnings')
  getCourierEarnings(@CurrentUser() principal: Principal) {
    return this.financeService.getCourierEarnings(principal.userId);
  }

  @Post('admin/payouts/generate')
  @RequirePermissions('admin.access')
  generatePayout(
    @Body(new ZodValidationPipe(triggerPayoutInputSchema)) body: TriggerPayoutInput,
  ) {
    return this.financeService.generateMerchantPayout(body);
  }

  @Get('admin/ledger')
  @RequirePermissions('admin.access')
  getLedger(@Query('limit') limit?: string) {
    return this.financeService.getLedgerEntries(limit ? Number(limit) : 50);
  }
}
