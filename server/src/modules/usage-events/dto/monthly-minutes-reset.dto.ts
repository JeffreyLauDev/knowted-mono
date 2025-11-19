import { ApiProperty } from "@nestjs/swagger";

export class MonthlyMinutesResetDto {
  @ApiProperty({
    description: "Whether the reset was successful",
    example: true,
    type: Boolean,
  })
  success: boolean;

  @ApiProperty({
    description: "Success message",
    example: "Monthly minutes usage reset successfully",
    type: String,
  })
  message: string;

  @ApiProperty({
    description: "Organization ID that was reset",
    example: "org-123",
    type: String,
  })
  organizationId: string;

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
}
