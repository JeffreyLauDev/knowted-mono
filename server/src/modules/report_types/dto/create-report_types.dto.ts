import { ApiProperty } from "@nestjs/swagger";

import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateReportTypesDto {
  @ApiProperty({
    description: "The title of the report",
    example: "Weekly Sales Report",
  })
  @IsNotEmpty()
  @IsString()
  report_title: string;

  @ApiProperty({
    description: "The prompt or description for generating the report",
    example:
      "Generate a weekly sales report showing total revenue by product category",
  })
  @IsNotEmpty()
  @IsString()
  report_prompt: string;

  @ApiProperty({
    description: "Schedule configuration for the report",
    example: {
      day: "1",
      time: "09:00",
      month: null,
      frequency: "weekly",
    },
  })
  @IsNotEmpty()
  @IsObject()
  report_schedule: {
    day: string;
    time: string;
    month: string | null;
    frequency: string;
  };

  @ApiProperty({
    description: "The ID of the organization this report belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description: "The ID of the user creating the report",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: "Whether the report is active",
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: "The date when the report was generated",
    example: "2024-03-20T00:00:00Z",
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  generation_date?: string;

  @ApiProperty({
    description: "The UTC timestamp when the report should run",
    example: "2024-03-20T09:00:00Z",
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  run_at_utc?: string;

  @ApiProperty({
    description: "Array of meeting type IDs associated with this report",
    example: ["123e4567-e89b-12d3-a456-426614174000"],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsUUID("4", { each: true })
  meeting_types?: string[];
}
