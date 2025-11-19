import { ApiProperty } from "@nestjs/swagger";

export class MonthlyMinutesUsageDto {
  @ApiProperty({
    description: "Minutes used this month",
    example: 150,
    type: Number,
  })
  currentUsage: number;

  @ApiProperty({
    description: "Monthly minutes limit",
    example: 300,
    type: Number,
  })
  monthlyLimit: number;

  @ApiProperty({
    description: "Percentage of limit used",
    example: 50,
    type: Number,
  })
  usagePercentage: number;

  @ApiProperty({
    description: "Whether organization can invite Knowted to meetings",
    example: true,
    type: Boolean,
  })
  canInviteKnowted: boolean;

  @ApiProperty({
    description: "Date when usage resets",
    example: "2024-02-15T00:00:00.000Z",
    type: String,
  })
  resetDate: string;

  @ApiProperty({
    description: "Plan tier (free, personal, business, company, custom)",
    example: "business",
    type: String,
    required: false,
  })
  planTier?: string;

  @ApiProperty({
    description: "Number of seats in the plan",
    example: 5,
    type: Number,
    required: false,
  })
  seatCount?: number;
}
