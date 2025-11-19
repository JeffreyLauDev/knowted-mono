import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class FindMeetingsDto {
  @ApiProperty({ required: true, description: "Organization ID" })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({ required: false, description: "Filter by team ID" })
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiProperty({ required: false, description: "Filter by meeting type ID" })
  @IsOptional()
  @IsString()
  meeting_type_id?: string;

  @ApiProperty({
    required: false,
    description: "Page number (0-based)",
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    required: false,
    description: "Number of items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    required: false,
    description: "Filter meetings from this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiProperty({
    required: false,
    description: "Filter meetings to this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiProperty({
    required: false,
    description: "Search query for meeting titles and participant emails",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
