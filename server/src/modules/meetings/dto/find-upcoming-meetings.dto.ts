import { ApiProperty } from "@nestjs/swagger";

import { Transform, Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class FindUpcomingMeetingsDto {
  @ApiProperty({ required: true, description: "Organization ID" })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    required: false,
    description: "Number of upcoming events to return (default: 10)",
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    required: false,
    description: "Number of days ahead to look for events (default: 30)",
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days_ahead?: number;
}
