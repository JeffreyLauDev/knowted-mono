import { ApiProperty } from "@nestjs/swagger";

export class BulkInviteResultDto {
  @ApiProperty({
    description: "Email address",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "Whether the invitation was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Error message if invitation failed",
    example: "User already invited",
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: "Invitation ID if successful",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  invitation_id?: string;
}

export class BulkInviteResponseDto {
  @ApiProperty({
    description: "Summary message",
    example: "Bulk invitation completed",
  })
  message: string;

  @ApiProperty({
    description: "Total number of invitations processed",
    example: 5,
  })
  total_processed: number;

  @ApiProperty({
    description: "Number of successful invitations",
    example: 4,
  })
  successful: number;

  @ApiProperty({
    description: "Number of failed invitations",
    example: 1,
  })
  failed: number;

  @ApiProperty({
    description: "Detailed results for each invitation",
    type: [BulkInviteResultDto],
  })
  results: BulkInviteResultDto[];
}
