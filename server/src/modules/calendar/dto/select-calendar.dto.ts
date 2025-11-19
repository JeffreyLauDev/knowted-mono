import { ApiProperty } from "@nestjs/swagger";

import { IsBoolean, IsEnum, IsString, IsUUID } from "class-validator";

import { CalendarProvider } from "../../calendar/interfaces/calendar-provider.interface";

export class SelectCalendarDto {
  @ApiProperty({
    description: "Calendar ID from MeetingBaas",
    example: "calendar_123",
  })
  @IsString()
  calendarId: string;

  @ApiProperty({
    description: "Calendar name",
    example: "Work Calendar",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Calendar email",
    example: "work@company.com",
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: "Google calendar ID (if applicable)",
    required: false,
    example: "google_calendar_id",
  })
  @IsString()
  googleId?: string;

  @ApiProperty({
    description: "Resource ID (if applicable)",
    required: false,
    example: "resource_id",
  })
  @IsString()
  resourceId?: string;

  @ApiProperty({
    description: "Calendar provider (google or microsoft)",
    enum: ["google", "microsoft"],
    example: "google",
  })
  @IsEnum(["google", "microsoft"])
  provider: CalendarProvider;

  @ApiProperty({
    description: "Whether to select this calendar for syncing",
    example: true,
  })
  @IsBoolean()
  selected: boolean;

  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsUUID()
  organizationId: string;
}
