import { ApiProperty } from "@nestjs/swagger";

import { SubscriptionStatus } from "../../organization-subscriptions/entities/organization-subscription.entity";

import { PricingPlanDetailsDto } from "./current-plan.dto";

export class SubscriptionStatusResponseDto {
  @ApiProperty({
    description: "Whether the organization has any subscription",
    example: true,
  })
  hasSubscription: boolean;

  @ApiProperty({
    description: "Current status of the subscription",
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
  isPastDue?: boolean;

  @ApiProperty({
    description: "Number of seats/licenses in the subscription",
    example: 5,
    nullable: true,
  })
  seatsCount?: number;

  @ApiProperty({
    description: "Plan identifier",
    example: "business_plan_monthly",
    nullable: true,
  })
  planId?: string;

  @ApiProperty({
    description: "Stripe subscription ID",
    example: "sub_1234567890",
    nullable: true,
  })
  subscriptionId?: string;

  @ApiProperty({
    description: "Pricing plan details",
    type: PricingPlanDetailsDto,
    nullable: true,
  })
  pricingPlan?: PricingPlanDetailsDto | null;
}
