import { ApiProperty } from "@nestjs/swagger";

import { PlanTier } from "../../pricing/entities/pricing-plan.entity";

export class SeatUsageDto {
  @ApiProperty({
    description: "Current number of seats in use",
    example: 3,
  })
  currentSeats: number;

  @ApiProperty({
    description: "Current plan tier",
    enum: PlanTier,
    example: "business",
  })
  planTier: PlanTier;

  @ApiProperty({
    description: "Maximum seats allowed for current plan",
    example: 5,
  })
  seatLimit: number;

  @ApiProperty({
    description: "Percentage of seats currently in use",
    example: 60,
  })
  usagePercentage: number;
}
