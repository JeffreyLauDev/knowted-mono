import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import {
    OrganizationSubscription,
    SubscriptionStatus,
} from "../organization-subscriptions/entities/organization-subscription.entity";
import { OrganizationsService } from "../organizations/organizations.service";
import { PlanTier, PricingPlan } from "../pricing/entities/pricing-plan.entity";
import { PricingService } from "../pricing/pricing.service";

export interface SeatValidationResult {
  isValid: boolean;
  currentSeats: number;
  requestedSeats: number;
  planTier: PlanTier;
  seatLimit: number;
  message?: string;
  requiresUpgrade?: boolean;
  suggestedPlan?: PlanTier;
}

export interface SeatUpgradeRecommendation {
  currentPlan: PlanTier;
  currentSeats: number;
  currentSeatLimit: number;
  recommendedPlan: PlanTier;
  recommendedSeatLimit: number;
  upgradeReason: string;
}

@Injectable()
export class SeatManagementService {
  private readonly logger = new Logger(SeatManagementService.name);

  constructor(
    @InjectRepository(OrganizationSubscription)
    private readonly orgSubRepo: Repository<OrganizationSubscription>,
    @InjectRepository(PricingPlan)
    private readonly pricingPlanRepo: Repository<PricingPlan>,
    private readonly organizationsService: OrganizationsService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Validate if an organization can add the requested number of seats
   */
  async validateSeatAddition(
    organizationId: string,
    additionalSeats: number,
  ): Promise<SeatValidationResult> {
    const subscription = await this.getActiveSubscription(organizationId);
    if (!subscription) {
      throw new NotFoundException("No active subscription found");
    }

    const currentSeats = subscription.seats_count;
    const requestedSeats = currentSeats + additionalSeats;

    return this.validateSeatCount(organizationId, requestedSeats);
  }

  /**
   * Validate if an organization can have the requested number of seats
   */
  async validateSeatCount(
    organizationId: string,
    requestedSeats: number,
  ): Promise<SeatValidationResult> {
    const subscription = await this.getActiveSubscription(organizationId);
    if (!subscription) {
      throw new NotFoundException("No active subscription found");
    }

    const currentSeats = subscription.seats_count;
    const planTier = await this.getPlanTierFromSubscription(subscription);
    const pricingPlan = await this.getPricingPlanByTier(planTier);

    if (!pricingPlan) {
      throw new NotFoundException(
        `Pricing plan not found for tier: ${planTier}`,
      );
    }

    const seatLimit = pricingPlan.seatLimit;
    const isValid = requestedSeats <= seatLimit;

    const result: SeatValidationResult = {
      isValid,
      currentSeats,
      requestedSeats,
      planTier,
      seatLimit,
    };

    if (!isValid) {
      result.requiresUpgrade = true;
      result.message = `Cannot add seats. Current plan (${planTier}) has a limit of ${seatLimit} seats. Requested: ${requestedSeats}`;

      // Suggest the next plan that can accommodate the requested seats
      const recommendation =
        await this.getUpgradeRecommendation(requestedSeats);
      if (recommendation) {
        result.suggestedPlan = recommendation.recommendedPlan;
        result.message += ` Consider upgrading to ${recommendation.recommendedPlan} plan.`;
      }
    }

    return result;
  }

  /**
   * Get upgrade recommendation for a given seat count
   */
  async getUpgradeRecommendation(
    requestedSeats: number,
  ): Promise<SeatUpgradeRecommendation | null> {
    const plans = await this.pricingPlanRepo.find({
      where: { isActive: true },
      order: { seatLimit: "ASC" },
    });

    // Find the first plan that can accommodate the requested seats
    const recommendedPlan = plans.find(
      (plan) => plan.seatLimit >= requestedSeats,
    );

    if (!recommendedPlan) {
      return null;
    }

    return {
      currentPlan: null, // Will be filled by caller
      currentSeats: requestedSeats,
      currentSeatLimit: 0, // Will be filled by caller
      recommendedPlan: recommendedPlan.tier,
      recommendedSeatLimit: recommendedPlan.seatLimit,
      upgradeReason: `Plan supports up to ${recommendedPlan.seatLimit} seats`,
    };
  }

  /**
   * Check if organization needs to upgrade plan based on current seat usage
   */
  async checkUpgradeNeeded(
    organizationId: string,
  ): Promise<SeatUpgradeRecommendation | null> {
    const subscription = await this.getActiveSubscription(organizationId);
    if (!subscription) {
      return null;
    }

    const currentSeats = subscription.seats_count;
    const planTier = await this.getPlanTierFromSubscription(subscription);
    const pricingPlan = await this.getPricingPlanByTier(planTier);

    if (!pricingPlan) {
      return null;
    }

    const currentSeatLimit = pricingPlan.seatLimit;

    // If current seats are within limit, no upgrade needed
    if (currentSeats <= currentSeatLimit) {
      return null;
    }

    // Find the next plan that can accommodate current seats
    const recommendation = await this.getUpgradeRecommendation(currentSeats);
    if (recommendation) {
      recommendation.currentPlan = planTier;
      recommendation.currentSeatLimit = currentSeatLimit;
      recommendation.upgradeReason = `Current usage (${currentSeats} seats) exceeds plan limit (${currentSeatLimit} seats)`;
    }

    return recommendation;
  }

  /**
   * Get the maximum seats allowed for a plan tier
   */
  async getSeatLimitForPlan(planTier: PlanTier): Promise<number> {
    const pricingPlan = await this.getPricingPlanByTier(planTier);
    if (!pricingPlan) {
      throw new NotFoundException(
        `Pricing plan not found for tier: ${planTier}`,
      );
    }
    return pricingPlan.seatLimit;
  }

  /**
   * Get current seat usage for an organization
   */
  async getCurrentSeatUsage(organizationId: string): Promise<{
    currentSeats: number;
    planTier: PlanTier;
    seatLimit: number;
    usagePercentage: number;
  }> {
    const subscription = await this.getActiveSubscription(organizationId);
    if (!subscription) {
      throw new NotFoundException("No active subscription found");
    }

    const currentSeats = subscription.seats_count;
    const planTier = await this.getPlanTierFromSubscription(subscription);
    const pricingPlan = await this.getPricingPlanByTier(planTier);

    if (!pricingPlan) {
      throw new NotFoundException(
        `Pricing plan not found for tier: ${planTier}`,
      );
    }

    const seatLimit = pricingPlan.seatLimit;
    const usagePercentage = Math.round((currentSeats / seatLimit) * 100);

    return {
      currentSeats,
      planTier,
      seatLimit,
      usagePercentage,
    };
  }

  /**
   * Get all plan tiers that can accommodate a given seat count
   */
  async getCompatiblePlans(seatCount: number): Promise<PricingPlan[]> {
    return this.pricingPlanRepo.find({
      where: {
        isActive: true,
        seatLimit: seatCount,
      },
      order: { seatLimit: "ASC" },
    });
  }

  /**
   * Private helper methods
   */
  private async getActiveSubscription(
    organizationId: string,
  ): Promise<OrganizationSubscription | null> {
    return this.orgSubRepo.findOne({
      where: {
        organization_id: organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  protected async getPlanTierFromSubscription(
    subscription: OrganizationSubscription,
  ): Promise<PlanTier> {
    // Try to get plan tier from stripe_product_id first
    if (subscription.stripe_product_id) {
      const pricingPlan = await this.pricingPlanRepo.findOne({
        where: { stripeProductId: subscription.stripe_product_id },
      });
      if (pricingPlan) {
        return pricingPlan.tier;
      }
    }

    // Fallback to inferring from plan_id
    if (subscription.stripe_plan_id) {
      const planId = subscription.stripe_plan_id.toLowerCase();
      if (planId.includes("personal")) {
        return PlanTier.PERSONAL;
      } else if (planId.includes("business")) {
        return PlanTier.BUSINESS;
      } else if (planId.includes("company")) {
        return PlanTier.COMPANY;
      } else if (planId.includes("custom")) {
        return PlanTier.CUSTOM;
      }
    }

    // Default to business if we can't determine
    return PlanTier.BUSINESS;
  }

  protected async getPricingPlanByTier(
    planTier: PlanTier,
  ): Promise<PricingPlan | null> {
    return this.pricingPlanRepo.findOne({
      where: { tier: planTier },
    });
  }
}
