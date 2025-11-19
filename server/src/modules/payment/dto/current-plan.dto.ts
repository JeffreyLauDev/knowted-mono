import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsUUID } from "class-validator";

import { SubscriptionStatus } from "../../organization-subscriptions/entities/organization-subscription.entity";
import { PlanTier } from "../../pricing/entities/pricing-plan.entity";

export class CurrentPlanFeatureDto {
  @ApiProperty({
    description: "Feature type identifier",
    example: "users_included",
  })
  featureType: string;

  @ApiProperty({
    description: "Human-readable feature label",
    example: "Users Included",
  })
  label: string;

  @ApiProperty({
    description: "Feature value (for non-boolean features)",
    example: "5 Seats",
    nullable: true,
  })
  value?: string;

  @ApiProperty({
    description: "Whether the feature is enabled",
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: "Sort order for display",
    example: 1,
  })
  sortOrder: number;
}

export class PricingPlanDetailsDto {
  @ApiProperty({
    description: "Pricing plan ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    nullable: true,
  })
  id?: string | null;

  @ApiProperty({
    description: "Plan tier",
    enum: PlanTier,
    example: "business",
    nullable: true,
  })
  tier?: PlanTier | null;

  @ApiProperty({
    description: "Plan name",
    example: "Business",
    nullable: true,
  })
  name?: string | null;

  @ApiProperty({
    description: "Plan description",
    example: "Suits Small to medium Businesses or growing teams.",
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    description: "Monthly price per seat",
    example: 35.0,
    nullable: true,
  })
  monthlyPrice?: number | null;

  @ApiProperty({
    description: "Annual price per seat",
    example: 29.0,
    nullable: true,
  })
  annualPrice?: number | null;

  @ApiProperty({
    description: "Call-to-action text",
    example: "Get Started Business",
    nullable: true,
  })
  cta?: string | null;

  @ApiProperty({
    description: "Maximum number of seats allowed",
    example: 5,
    nullable: true,
  })
  seatLimit?: number | null;

  @ApiProperty({
    description: "Whether this plan is marked as popular/recommended",
    example: true,
    nullable: true,
  })
  isPopular?: boolean | null;

  @ApiProperty({
    description: "Whether this plan is active",
    example: true,
    nullable: true,
  })
  isActive?: boolean | null;

  @ApiProperty({
    description: "Stripe product ID",
    example: "prod_ScLIFZ7DSV0FLW",
    nullable: true,
  })
  stripeProductId?: string | null;

  @ApiProperty({
    description: "Stripe monthly price ID",
    example: "price_business_monthly",
    nullable: true,
  })
  stripeMonthlyPriceId?: string | null;

  @ApiProperty({
    description: "Stripe annual price ID",
    example: "price_business_yearly",
    nullable: true,
  })
  stripeAnnualPriceId?: string | null;
}

export class CurrentPlanDto {
  @ApiProperty({
    description: "Whether the user has any subscription",
    example: true,
  })
  hasSubscription: boolean;

  @ApiProperty({
    description: "Current subscription status",
    enum: SubscriptionStatus,
    example: "active",
    nullable: true,
  })
  status?: SubscriptionStatus | null;

  @ApiProperty({
    description: "Whether the subscription is currently active",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: "Whether the subscription is in trial period",
    example: false,
  })
  isTrial: boolean;

  @ApiProperty({
    description: "Whether the subscription is past due",
    example: false,
    nullable: true,
  })
  isPastDue?: boolean | null;

  @ApiProperty({
    description: "Plan tier",
    enum: PlanTier,
    example: "business",
    nullable: true,
  })
  planTier?: PlanTier | null;

  @ApiProperty({
    description: "Plan name",
    example: "Business Plan",
    nullable: true,
  })
  planName?: string | null;

  @ApiProperty({
    description: "Plan description",
    example: "Suits Small to medium Businesses or growing teams.",
    nullable: true,
  })
  planDescription?: string | null;

  @ApiProperty({
    description: "Monthly price per seat",
    example: 35.0,
    nullable: true,
  })
  monthlyPrice?: number | null;

  @ApiProperty({
    description: "Annual price per seat",
    example: 29.0,
    nullable: true,
  })
  annualPrice?: number | null;

  @ApiProperty({
    description: "Billing cycle (monthly or annual)",
    example: "monthly",
    nullable: true,
  })
  billingCycle?: string | null;

  @ApiProperty({
    description: "Number of seats/licenses in the subscription",
    example: 5,
    nullable: true,
  })
  seatsCount?: number | null;

  @ApiProperty({
    description: "Maximum number of seats allowed for this plan",
    example: 5,
    nullable: true,
  })
  seatLimit?: number | null;

  @ApiProperty({
    description: "Plan identifier",
    example: "business_plan_monthly",
    nullable: true,
  })
  planId?: string | null;

  @ApiProperty({
    description: "Stripe subscription ID",
    example: "sub_1234567890",
    nullable: true,
  })
  subscriptionId?: string | null;

  @ApiProperty({
    description: "Stripe customer ID",
    example: "cus_1234567890",
    nullable: true,
  })
  customerId?: string | null;

  @ApiProperty({
    description: "Plan features",
    type: [CurrentPlanFeatureDto],
  })
  features: CurrentPlanFeatureDto[];

  @ApiProperty({
    description:
      "Whether the subscription will be canceled at the end of the current period",
    example: false,
    nullable: true,
  })
  cancelAtPeriodEnd?: boolean | null;

  @ApiProperty({
    description: "When the subscription will be canceled",
    example: "2024-12-31T23:59:59.000Z",
    nullable: true,
  })
  cancelAt?: Date | null;

  @ApiProperty({
    description: "Date when subscription was canceled",
    example: "2024-12-31T23:59:59.000Z",
    nullable: true,
  })
  canceledAt?: Date | null;

  @ApiProperty({
    description: "Message about the current plan status",
    example: "Your Business Plan is active with 5 seats",
    nullable: true,
  })
  message?: string | null;

  @ApiProperty({
    description: "Complete pricing plan details",
    type: PricingPlanDetailsDto,
    nullable: true,
  })
  pricingPlan?: PricingPlanDetailsDto | null;

  // Usage information
  @ApiProperty({
    description: "Current monthly minutes usage",
    example: 150,
    type: Number,
    nullable: true,
  })
  currentUsage?: number | null;

  @ApiProperty({
    description: "Monthly minutes limit",
    example: 300,
    type: Number,
    nullable: true,
  })
  monthlyLimit?: number | null;

  @ApiProperty({
    description: "Percentage of limit used",
    example: 50,
    type: Number,
    nullable: true,
  })
  usagePercentage?: number | null;

  @ApiProperty({
    description: "Whether organization can invite Knowted to meetings",
    example: true,
    type: Boolean,
    nullable: true,
  })
  canInviteKnowted?: boolean | null;

  @ApiProperty({
    description: "Date when usage resets",
    example: "2024-02-15T00:00:00.000Z",
    type: String,
    nullable: true,
  })
  usageResetDate?: string | null;
}

export class CurrentPlanQueryDto {
  @ApiProperty({
    description: "Organization ID to get the current plan for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;
}
