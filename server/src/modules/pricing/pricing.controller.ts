import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import {
  PricingConfigurationDto,
  PricingPlanDto,
} from "./dto/pricing-response.dto";
import { PlanTier } from "./entities/pricing-plan.entity";
import { PricingService } from "./pricing.service";

@ApiTags("Pricing")
@Controller("api/v1/pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get("configuration")
  @ApiOperation({
    summary: "Get complete pricing configuration",
    description:
      "Public endpoint to retrieve all pricing plans, features, and addon bundles for frontend/website use",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing configuration retrieved successfully",
    type: PricingConfigurationDto,
  })
  async getPricingConfiguration(): Promise<PricingConfigurationDto> {
    return this.pricingService.getPricingConfiguration();
  }

  @Get("plans")
  @ApiOperation({
    summary: "Get all pricing plans",
    description: "Get all active pricing plans with their features",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing plans retrieved successfully",
    type: [PricingPlanDto],
  })
  async getPricingPlans(): Promise<PricingPlanDto[]> {
    return this.pricingService.getPricingPlans();
  }

  @Get("plans/:tier")
  @ApiOperation({
    summary: "Get pricing plan by tier",
    description:
      "Get a specific pricing plan by its tier (personal, business, company, custom)",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing plan retrieved successfully",
    type: PricingPlanDto,
  })
  @ApiResponse({
    status: 404,
    description: "Plan not found",
  })
  async getPlanByTier(
    @Param("tier") tier: PlanTier,
  ): Promise<PricingPlanDto | null> {
    return this.pricingService.getPlanByTier(tier);
  }

  @Get("addon-bundles")
  @ApiOperation({
    summary: "Get addon bundles",
    description: "Get all available addon bundles for additional call minutes",
  })
  @ApiResponse({
    status: 200,
    description: "Addon bundles retrieved successfully",
  })
  async getAddonBundles() {
    return this.pricingService.getAddonBundles();
  }
}
