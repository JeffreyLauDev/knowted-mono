import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AddonBundle } from "./entities/addon-bundle.entity";
import { PricingPlan } from "./entities/pricing-plan.entity";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [TypeOrmModule.forFeature([PricingPlan, AddonBundle])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
