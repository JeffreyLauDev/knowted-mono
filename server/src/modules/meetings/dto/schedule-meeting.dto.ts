import { ApiProperty } from "@nestjs/swagger";

import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class ScheduleMeetingDto {
  @ApiProperty({
    required: true,
    description: "Meeting date and time (ISO 8601 format)",
    example: "2025-06-05T08:53:32.652Z",
  })
  @IsNotEmpty()
  @IsISO8601()
  meeting_date: string;

  @ApiProperty({
    required: true,
    description: "Meeting title",
    example: "Test meeting",
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    required: false,
    description: "Host email address",
    example: "testtest@gmail.com",
  })
  @IsOptional()
  @IsEmail()
  host_email?: string;

  @ApiProperty({
    required: false,
    description: "Meeting duration in minutes (e.g., 30 for 30 minutes)",
    default: 0,
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  duration_mins?: number = 0;

  @ApiProperty({
    required: false,
    description: "Participants email addresses",
    example: ["participant1@gmail.com", "participant2@gmail.com"],
    type: [String],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  participants_email: string[];

  @ApiProperty({
    required: true,
    description: "Meeting URL",
    example: "https://meet.google.com/zaw-feiq-dgh",
  })
  @IsNotEmpty()
  @IsString()
  meeting_url: string;

  @ApiProperty({
    required: false,
    description: "Meeting type ID",
    example: "00295433-ab54-4053-b98c-f0893d13c805",
  })
  @IsOptional()
  @IsUUID()
  meeting_type_id?: string;
}
