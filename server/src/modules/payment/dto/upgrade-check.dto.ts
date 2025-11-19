import { ApiProperty } from "@nestjs/swagger";

import { PlanTier } from "../../pricing/entities/pricing-plan.entity";

export class UpgradeCheckDto {
  @ApiProperty({
    description: "Current plan tier",
    enum: PlanTier,
    example: "personal",
  })
  currentPlan: PlanTier;

  @ApiProperty({
    description: "Current number of seats in use",
    example: 2,
  })
  currentSeats: number;

  @ApiProperty({
    description: "Maximum seats allowed for current plan",
    example: 1,
  })
  currentSeatLimit: number;

  @ApiProperty({
    description: "Recommended plan tier for upgrade",
    enum: PlanTier,
    example: "business",
  })
  recommendedPlan: PlanTier;

  @ApiProperty({
    description: "Maximum seats allowed for recommended plan",
    example: 5,
  })
  recommendedSeatLimit: number;

  @ApiProperty({
    description: "Reason why upgrade is needed",
    example: "Current usage (2 seats) exceeds plan limit (1 seats)",
  })
  upgradeReason: string;
}
