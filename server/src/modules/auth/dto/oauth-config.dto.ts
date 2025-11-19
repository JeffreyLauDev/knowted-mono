import { ApiProperty } from "@nestjs/swagger";

export class OAuthProviderConfigDto {
  @ApiProperty({
    description: "OAuth client ID",
    example:
      "125994626353-vhmbq31rtujb1iadei8f61ds37dggb48.apps.googleusercontent.com",
  })
  clientId: string;

  @ApiProperty({
    description: "OAuth redirect URI",
    example: "http://localhost:3000/calendar-oauth/callback",
  })
  redirectUri: string;

  @ApiProperty({
    description: "OAuth authorization URL",
    example: "https://accounts.google.com/o/oauth2/v2/auth",
  })
  authUrl: string;

  @ApiProperty({
    description: "Required OAuth scopes",
    example: ["https://www.googleapis.com/auth/calendar.readonly"],
    type: [String],
  })
  scopes: string[];

  @ApiProperty({
    description: "Required OAuth parameters",
    example: [
      "client_id",
      "redirect_uri",
      "response_type",
      "scope",
      "access_type",
      "prompt",
      "state",
    ],
    type: [String],
  })
  requiredParams: string[];
}

export class OAuthConfigResponseDto {
  @ApiProperty({
    description: "Google OAuth configuration",
    type: OAuthProviderConfigDto,
  })
  google: OAuthProviderConfigDto;

  @ApiProperty({
    description: "Microsoft OAuth configuration",
    type: OAuthProviderConfigDto,
  })
  microsoft: OAuthProviderConfigDto;
}
