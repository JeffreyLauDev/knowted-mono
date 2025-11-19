import { ApiProperty } from "@nestjs/swagger";

export class CalendarSyncStatusDto {
  @ApiProperty({
    description: "Whether Google calendar is synced",
    example: true,
  })
  google_calendar_synced: boolean;

  @ApiProperty({
    description: "Whether Microsoft calendar is synced",
    example: false,
  })
  microsoft_calendar_synced: boolean;

  @ApiProperty({
    description: "When Google calendar was last synced",
    example: "2025-08-04T12:00:00.000Z",
    nullable: true,
  })
  google_calendar_synced_at: string | null;

  @ApiProperty({
    description: "When Microsoft calendar was last synced",
    example: null,
    nullable: true,
  })
  microsoft_calendar_synced_at: string | null;

  @ApiProperty({
    description: "Whether user has Google OAuth tokens",
    example: true,
  })
  has_google_oauth: boolean;

  @ApiProperty({
    description: "Whether user has Microsoft OAuth tokens",
    example: false,
  })
  has_microsoft_oauth: boolean;
}
