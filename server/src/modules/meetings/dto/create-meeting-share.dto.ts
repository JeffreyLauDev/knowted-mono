import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateMeetingShareDto {
  @ApiProperty({
    description: "Meeting ID to create share link for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  meeting_id: string;

  @ApiPropertyOptional({
    description: "Optional expiry date for the share link",
    example: "2024-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
