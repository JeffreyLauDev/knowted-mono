import { ApiProperty } from "@nestjs/swagger";

export class MonthlyMinutesResetHistoryItemDto {
  @ApiProperty({
    description: "Date when the reset occurred",
    example: "2024-01-15T10:00:00.000Z",
    type: String,
  })
  resetDate: string;

  @ApiProperty({
    description: "Reason for the reset",
    example: "admin_override",
    type: String,
  })
  reason: string;

  @ApiProperty({
    description: "Usage before the reset",
    example: 250,
    type: Number,
  })
  previousUsage: number;

  @ApiProperty({
    description: "User who performed the reset",
    example: "admin-123",
    type: String,
  })
  resetBy: string;
}

export class MonthlyMinutesResetHistoryDto {
  @ApiProperty({
    description: "Array of reset history items",
    type: [MonthlyMinutesResetHistoryItemDto],
    items: {
      $ref: "#/components/schemas/MonthlyMinutesResetHistoryItemDto",
    },
  })
  data: MonthlyMinutesResetHistoryItemDto[];
}
