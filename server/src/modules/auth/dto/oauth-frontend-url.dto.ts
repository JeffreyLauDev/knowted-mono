import { ApiProperty } from "@nestjs/swagger";

export class OAuthFrontendUrlResponseDto {
  @ApiProperty({
    description: "Generated OAuth URL for frontend",
    example:
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...",
  })
  url: string;

  @ApiProperty({
    description: "OAuth provider",
    enum: ["google", "microsoft"],
    example: "google",
  })
  provider: string;
}
