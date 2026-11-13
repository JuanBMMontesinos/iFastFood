import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateTicketInput,
  createTicketInputSchema,
  uuidSchema,
} from '@ifastfood/contracts';
import { ZodValidationPipe } from '../common/pipes/zod.pipe';
import { CurrentUser } from '../identity/guards/decorators';
import type { Principal } from '../identity/types';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  createTicket(
    @CurrentUser() principal: Principal,
    @Body(new ZodValidationPipe(createTicketInputSchema)) body: CreateTicketInput,
  ) {
    return this.supportService.createTicket(principal.userId, body);
  }

  @Get('tickets/me')
  getMyTickets(@CurrentUser() principal: Principal) {
    return this.supportService.getMyTickets(principal.userId);
  }

  @Get('tickets/:id')
  getTicket(
    @CurrentUser() principal: Principal,
    @Param('id', new ZodValidationPipe(uuidSchema)) ticketId: string,
  ) {
    return this.supportService.getTicket(ticketId, principal.userId);
  }
}
