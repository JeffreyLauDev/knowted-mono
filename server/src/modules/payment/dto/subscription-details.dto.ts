import { ApiProperty } from "@nestjs/swagger";

import { SubscriptionStatus } from "../../organization-subscriptions/entities/organization-subscription.entity";

import { PricingPlanDetailsDto } from "./current-plan.dto";

export class SubscriptionDetailsDto {
  @ApiProperty({
    description: "Unique identifier for the subscription",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Current status of the subscription",
    enum: SubscriptionStatus,
    example: "active",
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: "Number of seats/licenses in the subscription",
    example: 5,
  })
  seatsCount: number;

  @ApiProperty({
    description: "Plan identifier",
    example: "business_plan_monthly",
  })
  planId: string;

  @ApiProperty({
    description: "Stripe product ID",
    example: "prod_1234567890",
    nullable: true,
  })
  stripeProductId?: string;

  @ApiProperty({
    description: "Stripe subscription ID",
    example: "sub_1234567890",
    nullable: true,
  })
  stripeSubscriptionId?: string;

  @ApiProperty({
    description: "When the subscription was created",
    example: "2024-01-01T00:00:00.000Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "When the subscription was last updated",
    example: "2024-01-15T12:00:00.000Z",
  })
  updatedAt: string;

  @ApiProperty({
    description: "Complete pricing plan details",
    type: PricingPlanDetailsDto,
    nullable: true,
  })
  pricingPlan?: PricingPlanDetailsDto | null;
}

export class SubscriptionDetailsResponseDto {
  @ApiProperty({
    description: "Whether the organization has any subscription",
    example: true,
  })
  hasSubscription: boolean;

  @ApiProperty({
    description: "The active subscription if any",
    type: SubscriptionDetailsDto,
    nullable: true,
  })
  activeSubscription: SubscriptionDetailsDto | null;

  @ApiProperty({
    description: "All subscriptions for the organization",
    type: [SubscriptionDetailsDto],
  })
  allSubscriptions: SubscriptionDetailsDto[];

  @ApiProperty({
    description: "Total number of subscriptions",
    example: 1,
  })
  subscriptionCount: number;

  @ApiProperty({
    description: "Optional message about the subscription status",
    example: "No subscription found for this organization.",
    nullable: true,
  })
  message?: string;
}

export class AvailablePlanDto {
  @ApiProperty({
    description: "Name of the plan",
    example: "Business Plan",
  })
  planName: string;

  @ApiProperty({
    description: "Stripe product ID",
    example: "prod_ScLIFZ7DSV0FLW",
  })
  productId: string;

  @ApiProperty({
    description: "Stripe price ID",
    example: "price_business_monthly",
  })
  priceId: string;

  @ApiProperty({
    description: "Price per seat in USD",
    example: 29.99,
  })
  pricePerSeat: number;

  @ApiProperty({
    description: "Billing cycle (month or year)",
    example: "month",
  })
  billingCycle: string;

  @ApiProperty({
    description: "Plan description",
    example: "Business Plan - monthly billing",
    nullable: true,
  })
  description?: string;
}

export class AvailablePlansResponseDto {
  @ApiProperty({
    description: "List of available payment plans",
    type: [AvailablePlanDto],
  })
  plans: AvailablePlanDto[];
}
