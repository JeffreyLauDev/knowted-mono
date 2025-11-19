import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import axios from "axios";

import {
  CalendarProvider,
  OAuthTokens,
} from "./interfaces/calendar-provider.interface";
import {
  OAuthConfig,
  OAuthUrlConfig,
} from "./interfaces/oauth-config.interface";

@Injectable()
export class OAuthProviderService {
  private readonly logger = new Logger(OAuthProviderService.name);
  private readonly googleConfig: OAuthConfig;
  private readonly microsoftConfig: OAuthConfig;

  constructor(private configService: ConfigService) {
    this.googleConfig = {
      clientId: this.configService.get<string>("GOOGLE_CLIENT_ID"),
      clientSecret: this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
      redirectUri: this.configService.get<string>("GOOGLE_REDIRECT_URI"),
    };

    this.microsoftConfig = {
      clientId: this.configService.get<string>("MICROSOFT_CLIENT_ID"),
      clientSecret: this.configService.get<string>("MICROSOFT_CLIENT_SECRET"),
      redirectUri: this.configService.get<string>("MICROSOFT_REDIRECT_URI"),
    };

    this.validateOAuthConfig("google");
    this.validateOAuthConfig("microsoft");
  }

  /**
   * Debug method to check redirect URI configuration
   */
  debugRedirectUriConfig(provider?: CalendarProvider): OAuthUrlConfig {
    if (provider === "google" || !provider) {
      const authorizationRedirectUri = this.googleConfig.redirectUri;
      const tokenExchangeRedirectUri = this.googleConfig.redirectUri;

      const match = authorizationRedirectUri === tokenExchangeRedirectUri;

      let details = "";
      if (!match) {
        details =
          "MISMATCH: Authorization and token exchange redirect URIs are different";
      } else {
        details =
          "MATCH: Both authorization and token exchange use the same redirect URI";
      }

      this.logger.log("Google Redirect URI Configuration Check:");
      this.logger.log(
        `- Authorization redirect URI: ${authorizationRedirectUri}`,
      );
      this.logger.log(
        `- Token exchange redirect URI: ${tokenExchangeRedirectUri}`,
      );
      this.logger.log(`- Match: ${match}`);
      this.logger.log(`- Details: ${details}`);

      return {
        provider: "google",
        authorizationRedirectUri,
        tokenExchangeRedirectUri,
        match,
        details,
      };
    } else if (provider === "microsoft") {
      const authorizationRedirectUri = this.microsoftConfig.redirectUri;
      const tokenExchangeRedirectUri = this.microsoftConfig.redirectUri;

      const match = authorizationRedirectUri === tokenExchangeRedirectUri;

      let details = "";
      if (!match) {
        details =
          "MISMATCH: Authorization and token exchange redirect URIs are different";
      } else {
        details =
          "MATCH: Both authorization and token exchange use the same redirect URI";
      }

      this.logger.log("Microsoft Redirect URI Configuration Check:");
      this.logger.log(
        `- Authorization redirect URI: ${authorizationRedirectUri}`,
      );
      this.logger.log(
        `- Token exchange redirect URI: ${tokenExchangeRedirectUri}`,
      );
      this.logger.log(`- Match: ${match}`);
      this.logger.log(`- Details: ${details}`);

      return {
        provider: "microsoft",
        authorizationRedirectUri,
        tokenExchangeRedirectUri,
        match,
        details,
      };
    }

    throw new Error("Unsupported provider");
  }

  private validateOAuthConfig(provider: CalendarProvider): void {
    const config =
      provider === "google" ? this.googleConfig : this.microsoftConfig;

    if (!config.clientId) {
      throw new Error(`${provider} OAuth Client ID is not configured`);
    }
    if (!config.clientSecret) {
      throw new Error(`${provider} OAuth Client Secret is not configured`);
    }
    if (!config.redirectUri) {
      throw new Error(`${provider} OAuth Redirect URI is not configured`);
    }

    this.logger.log(`${provider} OAuth Configuration Validation:`);
    this.logger.log(`- Client ID: ${config.clientId.substring(0, 10)}...`);
    this.logger.log(`- Redirect URI: ${config.redirectUri}`);
  }

  generateAuthUrl(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): string {
    const state = `${userId}--${organizationId}`;
    this.logger.log(`Generating OAuth URL - Provider: ${provider}`);
    this.logger.log(`Generated state: ${state}`);
    this.logger.log(`User ID: ${userId},  Organization ID: ${organizationId}`);

    if (provider === "google") {
      this.logger.log(`Using redirect URI: ${this.googleConfig.redirectUri}`);
      const params = new URLSearchParams({
        client_id: this.googleConfig.clientId,
        redirect_uri: this.googleConfig.redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state,
      });
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      this.logger.log(`Generated Google OAuth URL with state: ${state}`);
      this.logger.log(
        `Authorization URL redirect_uri: ${this.googleConfig.redirectUri}`,
      );
      return url;
    } else if (provider === "microsoft") {
      this.logger.log(
        `Using redirect URI: ${this.microsoftConfig.redirectUri}`,
      );
      const params = new URLSearchParams({
        client_id: this.microsoftConfig.clientId,
        redirect_uri: this.microsoftConfig.redirectUri,
        response_type: "code",
        scope:
          "https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access",
        prompt: "consent",
        state,
      });
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      this.logger.log(`Generated Microsoft OAuth URL with state: ${state}`);
      this.logger.log(
        `Authorization URL redirect_uri: ${this.microsoftConfig.redirectUri}`,
      );
      return url;
    }
    throw new Error("Unsupported provider");
  }

  async exchangeCodeForTokens(
    code: string,
    provider: CalendarProvider,
  ): Promise<OAuthTokens> {
    if (provider === "google") {
      return this.exchangeGoogleCodeForTokens(code);
    } else if (provider === "microsoft") {
      return this.exchangeMicrosoftCodeForTokens(code);
    }
    throw new Error("Unsupported provider");
  }

  private async exchangeGoogleCodeForTokens(
    code: string,
  ): Promise<OAuthTokens> {
    try {
      this.validateOAuthConfig("google");

      this.logger.log(`Exchanging code for tokens - Provider: google`);
      this.logger.log(
        `Client ID: ${this.googleConfig.clientId ? "Set" : "Missing"}`,
      );
      this.logger.log(
        `Client Secret: ${this.googleConfig.clientSecret ? "Set" : "Missing"}`,
      );
      this.logger.log(`Redirect URI: ${this.googleConfig.redirectUri}`);
      this.logger.log(`Code length: ${code?.length || 0}`);
      this.logger.log(`Code starts with: ${code?.substring(0, 10)}...`);

      const params = new URLSearchParams({
        code,
        client_id: this.googleConfig.clientId,
        client_secret: this.googleConfig.clientSecret,
        redirect_uri: this.googleConfig.redirectUri,
        grant_type: "authorization_code",
      });

      this.logger.log(`Making token exchange request to Google OAuth...`);

      const response = await axios.post(
        "https://oauth2.googleapis.com/token",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.logger.log(`Token exchange successful - Access token received`);
      return response.data;
    } catch (error) {
      this.handleOAuthError(error, "Google");
    }
  }

  private async exchangeMicrosoftCodeForTokens(
    code: string,
  ): Promise<OAuthTokens> {
    try {
      this.validateOAuthConfig("microsoft");

      this.logger.log(`Exchanging code for tokens - Provider: microsoft`);
      this.logger.log(
        `Client ID: ${this.microsoftConfig.clientId ? "Set" : "Missing"}`,
      );
      this.logger.log(
        `Client Secret: ${this.microsoftConfig.clientSecret ? "Set" : "Missing"}`,
      );
      this.logger.log(`Redirect URI: ${this.microsoftConfig.redirectUri}`);
      this.logger.log(`Code length: ${code?.length || 0}`);
      this.logger.log(`Code starts with: ${code?.substring(0, 10)}...`);

      const params = new URLSearchParams({
        code,
        client_id: this.microsoftConfig.clientId,
        client_secret: this.microsoftConfig.clientSecret,
        redirect_uri: this.microsoftConfig.redirectUri,
        grant_type: "authorization_code",
      });

      this.logger.log(`Making token exchange request to Microsoft OAuth...`);

      const response = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      this.logger.log(`Token exchange successful - Access token received`);
      return response.data;
    } catch (error) {
      this.handleOAuthError(error, "Microsoft");
    }
  }

  private handleOAuthError(error: any, provider: string): never {
    if (axios.isAxiosError(error)) {
      this.logger.error(
        `Failed to exchange code for tokens (${provider}) - Axios Error`,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
        },
      );

      if (error.response?.data) {
        const errorData = error.response.data;
        this.logger.error(`${provider} OAuth Error Details:`, {
          error: errorData.error,
          error_description: errorData.error_description,
          error_uri: errorData.error_uri,
        });

        if (errorData.error === "invalid_grant") {
          this.logger.error("Invalid grant error - possible causes:");
          this.logger.error(
            "1. Authorization code has expired (codes expire quickly)",
          );
          this.logger.error(
            "2. Authorization code has already been used (codes are single-use)",
          );
          this.logger.error(
            "3. Redirect URI mismatch between authorization and token exchange",
          );
          this.logger.error("4. Client ID/Secret mismatch");
          this.logger.error("5. Code was generated for a different client");

          throw new UnauthorizedException(
            "Authorization code is invalid, expired, or already used. Please try the OAuth flow again.",
          );
        } else if (errorData.error === "invalid_client") {
          throw new UnauthorizedException(
            "Invalid client credentials. Please check your OAuth configuration.",
          );
        } else if (errorData.error === "redirect_uri_mismatch") {
          throw new UnauthorizedException(
            "Redirect URI mismatch. Please check your OAuth redirect URI configuration.",
          );
        } else if (errorData.error === "invalid_request") {
          throw new UnauthorizedException(
            `Invalid request: ${errorData.error_description || "Missing required parameters"}`,
          );
        }
      }
    }

    this.logger.error(
      `Failed to exchange code for tokens (${provider})`,
      error,
    );
    throw new UnauthorizedException(
      "Failed to exchange authorization code for tokens. Please try again.",
    );
  }

  generateOAuthUrlForFrontend(
    provider: CalendarProvider,
    state: string,
  ): string {
    this.logger.log(
      `Generating OAuth URL for frontend - Provider: ${provider}`,
    );
    this.logger.log(`Original state: ${state}`);

    const stateWithProvider = `${provider}--${state}`;
    this.logger.log(`State with provider: ${stateWithProvider}`);

    if (provider === "google") {
      this.logger.log(`Google OAuth Configuration:`);
      this.logger.log(
        `- Client ID: ${this.googleConfig.clientId ? "Set" : "Missing"}`,
      );
      this.logger.log(`- Redirect URI: ${this.googleConfig.redirectUri}`);
      this.logger.log(
        `- Redirect URI length: ${this.googleConfig.redirectUri?.length || 0}`,
      );

      const params = new URLSearchParams({
        client_id: this.googleConfig.clientId,
        redirect_uri: this.googleConfig.redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state: stateWithProvider,
      });
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      this.logger.log(`Generated Google OAuth URL for frontend: ${url}`);
      this.logger.log(
        `Full redirect_uri parameter: ${this.googleConfig.redirectUri}`,
      );
      return url;
    } else if (provider === "microsoft") {
      this.logger.log(`Microsoft OAuth Configuration:`);
      this.logger.log(
        `- Client ID: ${this.microsoftConfig.clientId ? "Set" : "Missing"}`,
      );
      this.logger.log(`- Redirect URI: ${this.microsoftConfig.redirectUri}`);
      this.logger.log(
        `- Redirect URI length: ${this.microsoftConfig.redirectUri?.length || 0}`,
      );

      const params = new URLSearchParams({
        client_id: this.microsoftConfig.clientId,
        redirect_uri: this.microsoftConfig.redirectUri,
        response_type: "code",
        scope:
          "https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access",
        prompt: "consent",
        state: stateWithProvider,
      });
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      this.logger.log(`Generated Microsoft OAuth URL for frontend: ${url}`);
      this.logger.log(
        `Full redirect_uri parameter: ${this.microsoftConfig.redirectUri}`,
      );
      return url;
    }
    throw new Error("Unsupported provider");
  }
}
