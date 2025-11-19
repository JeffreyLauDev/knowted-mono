import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MeetingShareResponseDto {
  @ApiProperty({
    description: "Unique identifier for the share link",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Meeting ID that this share link is for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  meeting_id: string;

  @ApiProperty({
    description: "Unique share token for the link",
    example: "abc123def456",
  })
  share_token: string;

  @ApiProperty({
    description: "User ID who created the share link",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  created_by: string;

  @ApiPropertyOptional({
    description: "When the share link expires",
    example: "2024-12-31T23:59:59Z",
  })
  expires_at?: Date;

  @ApiProperty({
    description: "Whether the share link is currently active",
    example: true,
  })
  is_enabled: boolean;

  @ApiProperty({
    description: "When the share link was created",
    example: "2024-01-01T00:00:00Z",
  })
  created_at: Date;

  @ApiProperty({
    description: "When the share link was last updated",
    example: "2024-01-01T00:00:00Z",
  })
  updated_at: Date;
}
