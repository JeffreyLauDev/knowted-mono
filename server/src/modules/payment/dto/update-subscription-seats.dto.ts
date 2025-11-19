import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsNumber } from "class-validator";

import { PlanTier } from "../../pricing/entities/pricing-plan.entity";

export enum BillingCycle {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export class UpdateSubscriptionSeatsDto {
  @ApiProperty({
    description: "Number of seats for the subscription",
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  seatsCount: number;

  @ApiProperty({
    description: "Plan tier for the subscription",
    enum: PlanTier,
    example: "business",
  })
  @IsEnum(PlanTier)
  tier: PlanTier;

  @ApiProperty({
    description: "Billing cycle for the subscription",
    enum: BillingCycle,
    example: "monthly",
  })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}
