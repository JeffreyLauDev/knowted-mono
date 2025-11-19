import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizationSubscription } from "../organization-subscriptions/entities/organization-subscription.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PricingPlan } from "../pricing/entities/pricing-plan.entity";
import { PricingModule } from "../pricing/pricing.module";

import { SeatManagementService } from "./seat-management.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationSubscription, PricingPlan]),
    forwardRef(() => OrganizationsModule),
    PricingModule,
  ],
  providers: [SeatManagementService],
  exports: [SeatManagementService],
})
export class SeatManagementModule {}
