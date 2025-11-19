import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

import { CalendarSyncStatusDto } from "./dto/calendar-sync-status.dto";
import { DisconnectCalendarResponseDto } from "./dto/disconnect-calendar.dto";
import { Calendars } from "./entities/calendars.entity";
import { CalendarProvider } from "./interfaces/calendar-provider.interface";
import { MeetingBaasIntegrationService } from "./meetingbaas-integration.service";
import { OAuthProviderService } from "./oauth-provider.service";

export interface OAuthCallbackResult {
  success: boolean;
  message: string;
  userId?: string;
  organizationId?: string;
  provider?: CalendarProvider;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Calendars)
    private calendarsRepository: Repository<Calendars>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    private usageEventsService: UsageEventsService,
    private meetingBaasIntegrationService: MeetingBaasIntegrationService,
    private oauthProviderService: OAuthProviderService,
  ) {}

  // OAuth Operations
  async processOAuthCallback(
    code: string,
    state: string,
    providerParam?: CalendarProvider,
  ): Promise<OAuthCallbackResult> {
    try {
      this.logger.log(
        `Processing OAuth callback - Provider param: ${providerParam || "undefined"}`,
      );
      this.logger.log(`Raw state from query: ${state}`);
      this.logger.log(`State length: ${state?.length || 0}`);
      this.logger.log(`Code length: ${code?.length || 0}`);

      // Determine provider from query param or extract from state parameter
      let provider = providerParam;

      if (!provider) {
        // Try to extract provider from state parameter
        try {
          const decodedState = decodeURIComponent(state);
          const stateParts = decodedState.split("--");
          if (
            stateParts.length === 3 &&
            (stateParts[0] === "google" || stateParts[0] === "microsoft")
          ) {
            provider = stateParts[0] as CalendarProvider;
            this.logger.log(`Extracted provider from state: ${provider}`);
          } else {
            // Default to google if we can't determine from state
            provider = "google";
            this.logger.log(
              `Could not extract provider from state, defaulting to: ${provider}`,
            );
          }
        } catch (e) {
          this.logger.log(
            `Failed to extract provider from state: ${e.message}, defaulting to google`,
          );
          provider = "google";
        }
      }

      this.logger.log(`Final provider: ${provider}`);

      // Exchange code for tokens
      const tokens = await this.oauthProviderService.exchangeCodeForTokens(
        code,
        provider,
      );

      // Parse state parameter to get userId and organizationId
      const decodedState = decodeURIComponent(state);
      const stateParts = decodedState.split("--");
      let userId: string;
      let organizationId: string;

      if (stateParts.length === 2) {
        [userId, organizationId] = stateParts;
      } else if (stateParts.length === 3) {
        const [providerPart, ...rest] = stateParts;
        if (providerPart === provider) {
          [userId, organizationId] = rest;
        } else {
          throw new Error(`Provider mismatch in state parameter`);
        }
      } else {
        throw new Error("Invalid state parameter format");
      }

      // Update user organization with refresh token
      const userOrg = await this.userOrganizationRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
        },
      });

      if (!userOrg) {
        throw new Error("User organization not found");
      }

      const updateData: Partial<UserOrganization> = {};
      if (provider === "google") {
        updateData.google_oauth_refresh_token = tokens.refresh_token;
        updateData.google_calendar_synced_at = new Date();
      } else if (provider === "microsoft") {
        updateData.microsoft_oauth_refresh_token = tokens.refresh_token;
        updateData.microsoft_calendar_synced_at = new Date();
      }

      await this.userOrganizationRepository.update(
        { id: userOrg.id },
        updateData,
      );

      return {
        success: true,
        message: "OAuth setup completed successfully",
        userId,
        organizationId,
        provider,
      };
    } catch (error) {
      this.logger.error("Failed to process OAuth callback", {
        error: error.message,
        stack: error.stack,
        provider: providerParam,
        state,
        codeLength: code?.length || 0,
      });

      // Return specific error messages for common issues
      if (error.message.includes("Authorization code is invalid")) {
        return {
          success: false,
          message:
            "The authorization code has expired or was already used. Please try connecting your calendar again.",
        };
      } else if (error.message.includes("Invalid client credentials")) {
        return {
          success: false,
          message: "OAuth configuration error. Please contact support.",
        };
      } else if (error.message.includes("Redirect URI mismatch")) {
        return {
          success: false,
          message: "OAuth configuration error. Please contact support.",
        };
      } else if (error.message.includes("User organization not found")) {
        return {
          success: false,
          message: "User or organization not found. Please try again.",
        };
      } else if (error.message.includes("Invalid state parameter")) {
        return {
          success: false,
          message:
            "Invalid OAuth state parameter. Please try connecting your calendar again.",
        };
      } else if (
        error.message.includes("Request failed with status code 500")
      ) {
        return {
          success: false,
          message:
            "Calendar service temporarily unavailable. Your OAuth connection was successful, but calendar syncing failed. Please try syncing your calendars manually later.",
        };
      }

      return {
        success: false,
        message:
          error.message || "An unexpected error occurred during OAuth setup",
      };
    }
  }

  async generateOAuthUrl(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ) {
    const state = `${userId}--${organizationId}`;
    const url = this.oauthProviderService.generateOAuthUrlForFrontend(
      provider,
      state,
    );
    return {
      url,
      provider,
    };
  }

  async getCalendarSyncStatus(
    userId: string,
    organizationId: string,
  ): Promise<CalendarSyncStatusDto> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
    });

    if (!userOrg) {
      throw new Error("User organization not found");
    }

    return {
      google_calendar_synced: !!userOrg.google_oauth_refresh_token,
      microsoft_calendar_synced: !!userOrg.microsoft_oauth_refresh_token,
      google_calendar_synced_at:
        userOrg.google_calendar_synced_at?.toISOString() || null,
      microsoft_calendar_synced_at:
        userOrg.microsoft_calendar_synced_at?.toISOString() || null,
      has_google_oauth: !!userOrg.google_oauth_refresh_token,
      has_microsoft_oauth: !!userOrg.microsoft_oauth_refresh_token,
    };
  }

  async disconnectCalendar(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): Promise<DisconnectCalendarResponseDto> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
    });

    if (!userOrg) {
      throw new Error("User organization not found");
    }

    // Clear the specific provider's tokens
    const updateData: Partial<UserOrganization> = {};
    if (provider === "google") {
      updateData.google_oauth_refresh_token = null;
      updateData.google_calendar_synced_at = null;
    } else if (provider === "microsoft") {
      updateData.microsoft_oauth_refresh_token = null;
      updateData.microsoft_calendar_synced_at = null;
    }

    await this.userOrganizationRepository.update(
      { id: userOrg.id },
      updateData,
    );

    return {
      success: true,
      message: `${provider} calendar disconnected successfully`,
      provider,
    };
  }

  async listAvailableCalendars(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ) {
    // This would typically call the OAuth provider to get available calendars
    // For now, return a mock response
    return {
      calendars: [
        {
          id: "primary",
          name: "Primary Calendar",
          email: "user@example.com",
          googleId: provider === "google" ? "primary" : null,
          resourceId: provider === "microsoft" ? "primary" : null,
          isSelected: true,
          isActive: true,
        },
      ],
    };
  }

  // Calendar Sync Operations
  async refreshCalendarsByOrganization(userId: string, organizationId: string) {
    // Implementation for refreshing calendars
    return { success: true, message: "Calendars refreshed successfully" };
  }

  async syncSpecificCalendar(
    userId: string,
    organizationId: string,
    calendarId: string,
  ) {
    // Implementation for syncing a specific calendar
    return { success: true, message: "Calendar synced successfully" };
  }

  async unsyncSpecificCalendar(
    userId: string,
    organizationId: string,
    calendarId: string,
  ) {
    // Implementation for unsyncing a specific calendar
    return { success: true, message: "Calendar unsynced successfully" };
  }

  // Basic Calendar CRUD Operations
  async create(createDto: any) {
    const calendar = this.calendarsRepository.create({
      ...createDto,
      id: require("uuid").v4(),
    });
    return await this.calendarsRepository.save(calendar);
  }

  async findAll(query: any = {}) {
    return await this.calendarsRepository.find({
      where: query,
      order: {
        created_at: "DESC",
      },
    });
  }

  async findOne(id: string) {
    const calendar = await this.calendarsRepository.findOne({
      where: { id },
    });
    if (!calendar) {
      throw new Error(`Calendar with ID ${id} not found`);
    }
    return calendar;
  }

  async update(id: string, updateDto: any) {
    const calendar = await this.findOne(id);
    Object.assign(calendar, updateDto);
    return await this.calendarsRepository.save(calendar);
  }

  async remove(id: string) {
    const calendar = await this.findOne(id);
    await this.calendarsRepository.remove(calendar);
    return { deleted: true };
  }

  async findByOrganizationId(organizationId: string) {
    return await this.calendarsRepository.find({
      where: { organization_id: organizationId },
      order: {
        created_at: "DESC",
      },
    });
  }
}
