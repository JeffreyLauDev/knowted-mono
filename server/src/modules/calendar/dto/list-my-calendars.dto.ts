import { ApiProperty } from "@nestjs/swagger";

import { CalendarProvider } from "../entities/calendars.entity";

export class CalendarResponseDto {
  @ApiProperty({ description: "Calendar ID" })
  id: string;

  @ApiProperty({ description: "Calendar UUID for compatibility" })
  uuid: string;

  @ApiProperty({ description: "Calendar ID from provider" })
  calender_id: string;

  @ApiProperty({ description: "Calendar name", nullable: true })
  name: string | null;

  @ApiProperty({ description: "Calendar email", nullable: true })
  email: string | null;

  @ApiProperty({
    description: "Calendar provider",
    enum: ["google", "microsoft"],
  })
  provider: CalendarProvider;

  @ApiProperty({ description: "Whether calendar is active", nullable: true })
  active: boolean | null;

  @ApiProperty({ description: "Whether calendar is synced" })
  isSynced: boolean;

  @ApiProperty({ description: "Whether calendar is primary" })
  isPrimary: boolean;

  @ApiProperty({ description: "Creation date" })
  created_at: Date;

  @ApiProperty({ description: "Organization ID", nullable: true })
  organization_id: string | null;

  @ApiProperty({ description: "Resource ID", nullable: true })
  resource_id: string | null;

  @ApiProperty({
    description: "Google ID for Google calendars",
    nullable: true,
  })
  google_id: string | null;
}

export class ListMyCalendarsResponseDto extends Array<CalendarResponseDto> {}
