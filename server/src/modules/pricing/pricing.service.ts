import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import {
  AddonBundleDto,
  PricingConfigurationDto,
  PricingPlanDto,
} from "./dto/pricing-response.dto";
import { AddonBundle } from "./entities/addon-bundle.entity";
import { PlanTier, PricingPlan } from "./entities/pricing-plan.entity";

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectRepository(PricingPlan)
    private readonly pricingPlanRepo: Repository<PricingPlan>,
    @InjectRepository(AddonBundle)
    private readonly addonBundleRepo: Repository<AddonBundle>,
  ) {}

  /**
   * Get complete pricing configuration for frontend/website
   */
  async getPricingConfiguration(): Promise<PricingConfigurationDto> {
    try {
      const [plans, addonBundles] = await Promise.all([
        this.getPricingPlans(),
        this.getAddonBundles(),
      ]);

      const trustFeatures = this.getTrustFeatures();

      return {
        plans,
        addonBundles,
        trustFeatures,
      };
    } catch (error) {
      this.logger.error("Failed to get pricing configuration:", error);
      throw error;
    }
  }

  /**
   * Get all active pricing plans
   */
  async getPricingPlans(): Promise<PricingPlanDto[]> {
    try {
      // Get all active plans ordered by tier
      const plans = await this.pricingPlanRepo.find({
        where: { isActive: true },
        order: { tier: "ASC" },
      });

      // Convert to DTOs
      return plans.map((plan) => this.convertPlanToDto(plan));
    } catch (error) {
      this.logger.error("Failed to get pricing plans:", error);
      throw error;
    }
  }

  /**
   * Get addon bundles
   */
  async getAddonBundles(): Promise<AddonBundleDto[]> {
    try {
      const bundles = await this.addonBundleRepo.find({
        where: { isActive: true },
        order: { sort_order: "ASC" },
      });

      return bundles.map((bundle) => ({
        name: bundle.name,
        price: Number(bundle.price),
        minutes: bundle.minutes,
        tagline: bundle.tagline,
        sortOrder: bundle.sort_order,
      }));
    } catch (error) {
      this.logger.error("Failed to get addon bundles:", error);
      throw error;
    }
  }

  /**
   * Get trust features (static data)
   */
  private getTrustFeatures(): Array<{
    icon: string;
    title: string;
    description: string;
  }> {
    return [
      {
        icon: "Shield",
        title: "Enterprise Security",
        description: "SOC 2 Type II certified infrastructure",
      },
      {
        icon: "Zap",
        title: "Rapid Deployment",
        description: "Go live in days, not months",
      },
      {
        icon: "Users",
        title: "Dedicated Support",
        description: "Your success team from day one",
      },
      {
        icon: "Clock",
        title: "Flexible Scaling",
        description: "Grow at your own pace",
      },
    ];
  }

  /**
   * Convert plan entity to DTO
   */
  private convertPlanToDto(plan: PricingPlan): PricingPlanDto {
    return {
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      annualPrice: Number(plan.annualPrice),
      cta: plan.cta,
      seatLimit: plan.seatLimit,
      isPopular: plan.isPopular,

      stripeProductId: plan.stripeProductId,
      stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
      stripeAnnualPriceId: plan.stripeAnnualPriceId,
    };
  }

  /**
   * Get plan by tier
   */
  async getPlanByTier(tier: PlanTier): Promise<PricingPlanDto | null> {
    try {
      const plan = await this.pricingPlanRepo.findOne({
        where: { tier, isActive: true },
      });

      if (!plan) {
        return null;
      }

      return this.convertPlanToDto(plan);
    } catch (error) {
      this.logger.error(`Failed to get plan by tier ${tier}:`, error);
      throw error;
    }
  }
}
