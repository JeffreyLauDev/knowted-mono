import { ApiProperty } from "@nestjs/swagger";

import { CalendarProvider } from "../entities/calendars.entity";

export class CalendarSyncDetailDto {
  @ApiProperty({ description: "Calendar ID" })
  calendarId: string;

  @ApiProperty({ description: "Calendar name", nullable: true })
  calendarName: string | null;

  @ApiProperty({
    description: "Calendar provider",
    enum: ["google", "microsoft"],
  })
  provider: CalendarProvider;

  @ApiProperty({ description: "Whether calendar is active", nullable: true })
  active: boolean | null;

  @ApiProperty({ description: "Number of events in the calendar" })
  eventCount: number;

  @ApiProperty({ description: "Last sync date" })
  lastSync: Date;

  @ApiProperty({ description: "Error message if sync failed", required: false })
  error?: string;
}

export class EventSyncStatusResponseDto {
  @ApiProperty({ description: "Total number of calendars" })
  totalCalendars: number;

  @ApiProperty({ description: "Number of active calendars" })
  activeCalendars: number;

  @ApiProperty({ description: "Total number of events across all calendars" })
  totalEvents: number;

  @ApiProperty({ description: "Last sync time", nullable: true })
  lastSyncTime: string | null;

  @ApiProperty({
    description: "Detailed sync information for each calendar",
    type: [CalendarSyncDetailDto],
  })
  syncDetails: CalendarSyncDetailDto[];
}
