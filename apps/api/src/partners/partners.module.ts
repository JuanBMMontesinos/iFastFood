import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnerGuard } from './partner.guard';
import { PartnersController } from './http/partners.controller';
import { AdminPartnersController } from './http/admin/partners.controller';
import { PartnersService } from './services/partners.service';
import { PartnerKycService } from './services/partner-kyc.service';
import { PartnerStaffService } from './services/partner-staff.service';
import { PartnersAdminService } from './services/partners-admin.service';

@Module({
  imports: [IdentityModule, PrismaModule],
  controllers: [PartnersController, AdminPartnersController],
  providers: [
    PartnerGuard,
    PartnersService,
    PartnerKycService,
    PartnerStaffService,
    PartnersAdminService,
  ],
  exports: [PartnerGuard, PartnersService, PartnersAdminService],
})
export class PartnersModule {}
