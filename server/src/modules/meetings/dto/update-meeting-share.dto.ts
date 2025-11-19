import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsDateString, IsOptional } from "class-validator";

export class UpdateMeetingShareDto {
  @ApiPropertyOptional({
    description: "Whether the share link is enabled",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional({
    description: "When the share link expires",
    example: "2024-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
