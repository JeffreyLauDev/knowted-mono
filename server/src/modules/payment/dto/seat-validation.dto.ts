import { ApiProperty } from "@nestjs/swagger";

import { PlanTier } from "../../pricing/entities/pricing-plan.entity";

export class SeatValidationDto {
  @ApiProperty({
    description: "Whether the seat addition is valid",
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: "Current number of seats",
    example: 2,
  })
  currentSeats: number;

  @ApiProperty({
    description: "Requested total number of seats",
    example: 3,
  })
  requestedSeats: number;

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
    description: "Error message if validation fails",
    example:
      "Cannot add seats. Current plan (business) has a limit of 5 seats. Requested: 6. Consider upgrading to company plan.",
    nullable: true,
  })
  message?: string;

  @ApiProperty({
    description: "Whether an upgrade is required",
    example: true,
    nullable: true,
  })
  requiresUpgrade?: boolean;

  @ApiProperty({
    description: "Recommended plan tier for upgrade",
    enum: PlanTier,
    example: "company",
    nullable: true,
  })
  suggestedPlan?: PlanTier;
}
