import { ApiProperty } from "@nestjs/swagger";

import { CalendarProvider } from "../../calendar/interfaces/calendar-provider.interface";

export class OAuthUrlResponseDto {
  @ApiProperty({
    description: "OAuth authorization URL",
    example: "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  })
  url: string;

  @ApiProperty({
    description: "Calendar provider",
    enum: ["google", "microsoft"],
    example: "google",
  })
  provider: CalendarProvider;
}
