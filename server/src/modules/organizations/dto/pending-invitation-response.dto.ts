import { ApiProperty } from "@nestjs/swagger";

export class PendingInvitationResponseDto {
  @ApiProperty({
    description: "Invitation ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  organization_id: string;

  @ApiProperty({
    description: "Team ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  team_id: string;

  @ApiProperty({
    description: "Team name",
    example: "Engineering",
  })
  team_name: string;

  @ApiProperty({
    description: "Email of the invited user",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "When the invitation was created",
    example: "2024-01-15T10:30:00Z",
  })
  created_at: Date;

  @ApiProperty({
    description: "When the invitation expires",
    example: "2024-01-22T10:30:00Z",
  })
  expires_at: Date;

  @ApiProperty({
    description: "Whether the invitation has been accepted",
    example: false,
  })
  is_accepted: boolean;

  @ApiProperty({
    description: "User ID who accepted the invitation",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  accepted_by_user_id?: string | null;
}
