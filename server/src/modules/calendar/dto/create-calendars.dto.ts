import { ApiProperty } from "@nestjs/swagger";

import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { CalendarProvider } from "../entities/calendars.entity";

export class CreateCalendarsDto {
  @ApiProperty({
    description: "Whether the calendar is active",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: "The calendar ID" })
  @IsString()
  calender_id: string;

  @ApiProperty({
    description: "The email associated with the calendar",
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  // @ApiProperty({ description: "The Google ID for the calendar" })
  // @IsString()
  // google_id: string;

  @ApiProperty({ description: "The name of the calendar", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "The organization ID", required: false })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ description: "The resource ID", required: false })
  @IsOptional()
  @IsString()
  resource_id?: string;

  @ApiProperty({
    description: "The calendar provider (google or microsoft)",
    enum: ["google", "microsoft"],
    required: true,
  })
  @IsEnum(["google", "microsoft"])
  provider: CalendarProvider;

  @ApiProperty({ description: "The user ID", required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
