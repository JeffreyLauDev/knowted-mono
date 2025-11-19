import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { createBaasClient, Event } from "@meeting-baas/sdk";
import { Repository } from "typeorm";

import { Meetings } from "../meetings/entities/meetings.entity";
import { MeetingsService } from "../meetings/meetings.service";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

import {
  CalendarResponseDto,
  ListMyCalendarsResponseDto,
} from "./dto/list-my-calendars.dto";
import { Calendars } from "./entities/calendars.entity";
import {
  AvailableCalendar,
  CalendarProvider,
  CalendarRefreshResult,
  CalendarSelectionResult,
  CalendarSyncStatus,
  DisconnectCalendarResult,
  RawCalendar,
} from "./interfaces/calendar-provider.interface";
import {
  CalendarSyncDetail,
  CalendarWhereClause,
  EventSyncStatusResponse,
  SyncCalendarEventsResponse,
} from "./interfaces/calendar-response.interface";
import { MeetingBaasIntegrationService } from "./meetingbaas-integration.service";

@Injectable()
export class CalendarManageService {
  private readonly logger = new Logger(CalendarManageService.name);
  private readonly client: ReturnType<typeof createBaasClient>;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Calendars)
    private calendarsRepository: Repository<Calendars>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Meetings)
    private meetingsRepository: Repository<Meetings>,
    private meetingBaasIntegrationService: MeetingBaasIntegrationService,
    private usageEventsService: UsageEventsService,
    @Inject(forwardRef(() => MeetingsService))
    private meetingsService: MeetingsService,
  ) {
    const apiKey = this.configService.get<string>("MEETING_BAAS_API_KEY");
    if (!apiKey) {
      throw new Error("MeetingBaas API key is not configured");
    }

    this.client = createBaasClient({
      api_key: apiKey,
      timeout: 60000,
    });

    this.logger.log("MeetingBaas SDK client initialized");
  }

  async getCalendarSyncStatus(
    userId: string,
    organizationId: string,
  ): Promise<CalendarSyncStatus> {
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
      google_calendar_synced: !!userOrg.google_calendar_synced_at,
      microsoft_calendar_synced: !!userOrg.microsoft_calendar_synced_at,
      google_calendar_synced_at:
        userOrg.google_calendar_synced_at?.toISOString() || null,
      microsoft_calendar_synced_at:
        userOrg.microsoft_calendar_synced_at?.toISOString() || null,
      has_google_oauth: !!userOrg.google_oauth_refresh_token,
      has_microsoft_oauth: !!userOrg.microsoft_oauth_refresh_token,
    };
  }

  async updateCalendarSyncStatus(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
    synced: boolean,
  ): Promise<void> {
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
      updateData.google_calendar_synced_at = synced ? new Date() : null;
    } else if (provider === "microsoft") {
      updateData.microsoft_calendar_synced_at = synced ? new Date() : null;
    }

    await this.userOrganizationRepository.update(
      { id: userOrg.id },
      updateData,
    );

    this.logger.log(
      `Updated ${provider} calendar sync status to ${synced} for user ${userId} in organization ${organizationId}`,
    );
  }

  async listAvailableCalendars(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): Promise<{ calendars: AvailableCalendar[] }> {
    // Get user organization to access OAuth tokens
    const userOrg = await this.userOrganizationRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
    });

    if (!userOrg) {
      throw new Error("User organization not found");
    }

    let refreshToken: string;
    if (provider === "google") {
      if (!userOrg.google_oauth_refresh_token) {
        this.logger.log(
          "No Google OAuth refresh token found, returning empty calendar list",
        );
        return { calendars: [] };
      }
      refreshToken = userOrg.google_oauth_refresh_token;
    } else if (provider === "microsoft") {
      if (!userOrg.microsoft_oauth_refresh_token) {
        this.logger.log(
          "No Microsoft OAuth refresh token found, returning empty calendar list",
        );
        return { calendars: [] };
      }
      refreshToken = userOrg.microsoft_oauth_refresh_token;
    } else {
      throw new Error("Unsupported provider");
    }

    // Get raw calendars from MeetingBaas
    const rawCalendars = await this.listRawCalendars(refreshToken, provider);

    // Get existing calendars from database to check which ones are selected/active
    const existingCalendars = await this.calendarsRepository.find({
      where: {
        organization_id: organizationId,
        profile: { id: userId },
      },
    });
    this.logger.log("Raw calendars found:", rawCalendars);

    // Map raw calendars to response format
    const calendars = rawCalendars.map((rawCalendar) => {
      const existingCalendar = existingCalendars.find(
        (cal) => cal.email === rawCalendar.email,
      );

      return {
        id: rawCalendar.id,
        name: rawCalendar.name || "Unnamed Calendar",
        email: rawCalendar.email || "",
        googleId: rawCalendar.id,
        resourceId: rawCalendar.resource_id,
        isSelected: !!existingCalendar,
        isActive: existingCalendar?.active || false,
      };
    });

    return { calendars };
  }

  async listMyCalendars(
    userId: string,
    organizationId: string,
    provider?: CalendarProvider,
  ): Promise<ListMyCalendarsResponseDto> {
    try {
      // Build where clause with proper profile relationship
      const whereClause: CalendarWhereClause = {
        organization_id: organizationId,
        profile: { id: userId }, // Use profile relationship
      };

      // Add provider filter if specified
      if (provider) {
        whereClause.provider = provider;
      }

      this.logger.log(`Searching for calendars with criteria:`, {
        organization_id: organizationId,
        profile_id: userId,
        provider: provider || "all",
      });

      // Get calendars from database with proper relations
      const calendars = await this.calendarsRepository.find({
        where: whereClause,
        relations: ["profile", "organization"],
        order: {
          created_at: "DESC",
        },
      });

      this.logger.log(
        `Found ${calendars.length} synced calendars for user ${userId} in organization ${organizationId}`,
      );

      // Map to response format with additional fields
      const mappedCalendars: CalendarResponseDto[] = calendars.map(
        (calendar) => ({
          id: calendar.id,
          uuid: calendar.id, // Add uuid for compatibility
          calender_id: calendar.calender_id,
          name: calendar.name,
          email: calendar.email,
          provider: calendar.provider,
          active: calendar.active,
          isSynced: calendar.active, // Add isSynced field
          isPrimary: false, // Add isPrimary field
          created_at: calendar.created_at,
          organization_id: calendar.organization_id,
          resource_id: calendar.resource_id,
          google_id:
            calendar.provider === "google" ? calendar.calender_id : null, // Add google_id for compatibility
        }),
      );

      this.logger.log(
        `Mapped ${mappedCalendars.length} calendars for response`,
      );

      return mappedCalendars;
    } catch (error) {
      this.logger.error(`Error in listMyCalendars:`, error);
      throw error;
    }
  }

  async getEventSyncStatus(
    userId: string,
    organizationId: string,
    provider?: CalendarProvider,
  ): Promise<EventSyncStatusResponse> {
    try {
      // Get user organization to check OAuth tokens
      const userOrg = await this.userOrganizationRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
        },
      });

      if (!userOrg) {
        throw new Error("User organization not found");
      }

      // Build where clause for calendars with proper profile relationship
      const whereClause: CalendarWhereClause = {
        organization_id: organizationId,
        profile: { id: userId }, // Use profile relationship
      };

      if (provider) {
        whereClause.provider = provider;
      }

      // Get synced calendars from database
      const calendars = await this.calendarsRepository.find({
        where: whereClause,
        relations: ["profile", "organization"],
        order: {
          created_at: "DESC",
        },
      });

      const totalCalendars = calendars.length;
      const activeCalendars = calendars.filter((cal) => cal.active).length;
      const lastSyncTime =
        userOrg.google_calendar_synced_at ||
        userOrg.microsoft_calendar_synced_at;

      // Get event count from MeetingBaas for each calendar
      const syncDetails: CalendarSyncDetail[] = [];
      let totalEvents = 0;

      for (const calendar of calendars) {
        try {
          const eventsResult =
            await this.meetingBaasIntegrationService.listCalendarEvents({
              calendarId: calendar.calender_id,
              status: "upcoming",
            });

          const eventCount =
            eventsResult.success && eventsResult.data
              ? eventsResult.data.length
              : 0;
          totalEvents += eventCount;

          syncDetails.push({
            calendarId: calendar.calender_id,
            calendarName: calendar.name,
            provider: calendar.provider,
            active: calendar.active,
            eventCount,
            lastSync: calendar.created_at,
          });
        } catch (error) {
          this.logger.error(
            `Error getting events for calendar ${calendar.calender_id}:`,
            error,
          );
          syncDetails.push({
            calendarId: calendar.calender_id,
            calendarName: calendar.name,
            provider: calendar.provider,
            active: calendar.active,
            eventCount: 0,
            error: error.message,
            lastSync: calendar.created_at,
          });
        }
      }

      this.logger.log(`📊 Event Sync Status for user ${userId}:`);
      this.logger.log(`   - Total calendars: ${totalCalendars}`);
      this.logger.log(`   - Active calendars: ${activeCalendars}`);
      this.logger.log(`   - Total events: ${totalEvents}`);
      this.logger.log(`   - Last sync: ${lastSyncTime}`);

      return {
        totalCalendars,
        activeCalendars,
        totalEvents,
        lastSyncTime: lastSyncTime?.toISOString() || null,
        syncDetails,
      };
    } catch (error) {
      this.logger.error(`Error getting event sync status:`, error);
      throw error;
    }
  }

  async selectCalendar(
    calendarId: string,
    name: string,
    email: string,
    selected: boolean,
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
    googleId?: string,
    resourceId?: string,
  ): Promise<CalendarSelectionResult> {
    if (selected) {
      // Check if calendar already exists
      const existingCalendar = await this.calendarsRepository.findOne({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
          email: email,
        },
      });

      if (existingCalendar) {
        // Update existing calendar to active
        await this.calendarsRepository.update(
          { id: existingCalendar.id },
          { active: true },
        );

        return {
          success: true,
          message: `Calendar "${name}" is now selected for syncing`,
        };
      } else {
        // Create new calendar record
        const newCalendar = await this.calendarsRepository.save({
          id: calendarId,
          calender_id: calendarId,
          name,
          email,
          resource_id: resourceId,
          organization_id: organizationId,
          profile: { id: userId },
          provider,
          active: true,
        });

        return {
          success: true,
          message: `Calendar "${name}" has been selected for syncing`,
        };
      }
    } else {
      // Deselect calendar by setting it to inactive
      const existingCalendar = await this.calendarsRepository.findOne({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
          email: email,
        },
      });

      if (existingCalendar) {
        await this.calendarsRepository.update(
          { id: existingCalendar.id },
          { active: false },
        );

        return {
          success: true,
          message: `Calendar "${name}" has been deselected from syncing`,
        };
      } else {
        return {
          success: false,
          message: `Calendar "${name}" was not found in your selected calendars`,
        };
      }
    }
  }

  async updateSelectedCalendars(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
    selectedCalendarIds: string[],
  ): Promise<CalendarSelectionResult> {
    try {
      // Ensure selectedCalendarIds is always an array
      const calendarIds = selectedCalendarIds || [];

      this.logger.log(
        `Updating selected calendars for user ${userId} in org ${organizationId}. Selected IDs: ${calendarIds.join(", ")}`,
      );

      // Get all calendars for this user/org/provider
      const allCalendars = await this.calendarsRepository.find({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
          provider,
        },
      });

      this.logger.log(
        `Found ${allCalendars.length} calendars for user ${userId} in org ${organizationId}`,
      );

      // Mark selected as active, others as inactive
      for (const calendar of allCalendars) {
        const shouldBeActive = calendarIds.includes(calendar.id);
        if (calendar.active !== shouldBeActive) {
          await this.calendarsRepository.update(
            { id: calendar.id },
            { active: shouldBeActive },
          );

          this.logger.log(
            `Updated calendar ${calendar.id} (${calendar.name}) to active: ${shouldBeActive}`,
          );
        }
      }

      return {
        success: true,
        message: `Updated selected calendars for user ${userId} in org ${organizationId}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update selected calendars for user ${userId} in org ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  async disconnectCalendar(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): Promise<DisconnectCalendarResult> {
    try {
      this.logger.log(
        `Disconnecting ${provider} calendar for user ${userId} in organization ${organizationId}`,
      );

      // Find user organization record
      const userOrg = await this.userOrganizationRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
        },
      });

      if (!userOrg) {
        throw new Error("User organization not found");
      }

      // Prepare update data to clear provider-specific fields
      const updateData: Partial<UserOrganization> = {};

      if (provider === "google") {
        updateData.google_oauth_refresh_token = null;
        updateData.google_calendar_synced_at = null;
      } else if (provider === "microsoft") {
        updateData.microsoft_oauth_refresh_token = null;
        updateData.microsoft_calendar_synced_at = null;
      } else {
        throw new Error("Unsupported provider");
      }

      // Update user organization to remove OAuth tokens and sync status
      await this.userOrganizationRepository.update(
        { id: userOrg.id },
        updateData,
      );

      // Find calendars for this user/organization that belong to the specific provider
      const calendarsToUnsync = await this.calendarsRepository.find({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
          provider,
        },
      });

      this.logger.log(
        `Found ${calendarsToUnsync.length} total calendars for user ${userId} in organization ${organizationId}`,
      );

      this.logger.log(
        `Found ${calendarsToUnsync.length} ${provider} calendars to unsync for user ${userId}`,
      );

      // Log details about the calendars being processed
      this.logger.log(
        `Calendar details for ${provider}:`,
        calendarsToUnsync.map((cal) => ({
          id: cal.id,
          name: cal.name,
          email: cal.email,
          resource_id: cal.resource_id,
        })),
      );

      let totalMeetingsRemoved = 0;

      if (calendarsToUnsync.length > 0) {
        // Remove meetings from database immediately (synchronous)
        for (const calendar of calendarsToUnsync) {
          try {
            const meetingsToDelete =
              await this.meetingsService.findUnanalyzedMeetingsByCalendarId(
                calendar.id,
              );
            if (meetingsToDelete.length > 0) {
              this.logger.log(
                `Found ${meetingsToDelete.length} unanalyzed meetings for calendar ${calendar.id}, removing them...`,
              );

              // Delete meetings from database immediately
              await this.meetingsService.deleteMany(
                meetingsToDelete.map((m) => m.id),
              );
              totalMeetingsRemoved += meetingsToDelete.length;

              this.logger.log(
                `Successfully removed ${meetingsToDelete.length} meetings associated with calendar ${calendar.id}`,
              );
            }
          } catch (error) {
            this.logger.warn(
              `Failed to remove meetings for calendar ${calendar.id}: ${error.message}`,
            );
          }
        }

        // Remove the provider-specific calendars from database immediately
        await this.calendarsRepository.remove(calendarsToUnsync);
        this.logger.log(
          `Removed ${calendarsToUnsync.length} ${provider} calendars for user ${userId} in organization ${organizationId}`,
        );

        // Start MeetingBaas cleanup in background (fire and forget)
        calendarsToUnsync.forEach((calendar) => {
          this.client
            .deleteCalendar({
              uuid: calendar.calender_id,
            })
            .then((deleteResult) => {
              if (deleteResult.success) {
                this.logger.log(
                  `Successfully deleted calendar ${calendar.calender_id} from MeetingBaas`,
                );
              } else {
                this.logger.warn(
                  `Failed to delete calendar ${calendar.calender_id} from MeetingBaas: ${deleteResult.error?.message || "Unknown error"}`,
                );
              }
            })
            .catch((error) => {
              this.logger.warn(
                `Failed to notify MeetingBaas about calendar ${calendar.calender_id} deactivation: ${error.message}`,
              );
            });
        });
      }

      this.logger.log(
        `Successfully disconnected ${provider} calendar for user ${userId} in organization ${organizationId}`,
      );

      return {
        success: true,
        message: `${provider} calendar disconnected successfully. ${calendarsToUnsync.length} calendars have been removed and ${totalMeetingsRemoved} unanalyzed meetings have been deleted. MeetingBaas cleanup is running in the background.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to disconnect ${provider} calendar for user ${userId} in organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  async refreshCalendarsByOrganization(
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): Promise<CalendarRefreshResult> {
    try {
      this.logger.log(`🔄 Refreshing calendars for user ${userId}`);

      // Get user organization
      const userOrg = await this.userOrganizationRepository.findOne({
        where: { user_id: userId, organization_id: organizationId },
      });

      if (!userOrg) {
        throw new Error("User organization not found");
      }

      // Get refresh token
      const refreshToken =
        provider === "google"
          ? userOrg.google_oauth_refresh_token
          : userOrg.microsoft_oauth_refresh_token;

      if (!refreshToken) {
        throw new Error(`No ${provider} OAuth refresh token found`);
      }

      // Get available calendars
      const rawCalendars = await this.listRawCalendars(refreshToken, provider);

      // Get existing calendars
      const existingCalendars = await this.calendarsRepository.find({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
          provider,
        },
      });

      // Find missing calendars
      const missingCalendars = rawCalendars.filter(
        (rawCalendar) =>
          !existingCalendars.some(
            (existing) => existing.email === rawCalendar.email,
          ),
      );

      // Sync missing calendars in batches
      let syncedCount = 0;
      const batchSize = 1000; // Process 1000 calendars at a time

      for (let i = 0; i < missingCalendars.length; i += batchSize) {
        const batch = missingCalendars.slice(i, i + batchSize);

        // Process all calendars in the batch concurrently
        const batchCreateCalendars = batch.map(async (calendar) => {
          try {
            await this.createCalendarAndSyncEvents(
              calendar,
              refreshToken,
              userId,
              organizationId,
              provider,
            );
            return { success: true, calendar };
          } catch (error) {
            this.logger.error(
              `Failed to sync calendar ${calendar.name}: ${error.message}`,
            );
            return { success: false, calendar, error: error.message };
          }
        });

        // Wait for all calendars in the batch to complete
        const batchResults = await Promise.allSettled(batchCreateCalendars);
        // Count successful syncs
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value.success) {
            syncedCount++;
          }
        });

        this.logger.log(
          `📊 Calendar batch ${Math.floor(i / batchSize) + 1} completed: ${batch.length} calendars processed`,
        );
      }

      const message =
        syncedCount > 0
          ? `Synced ${syncedCount} new calendars`
          : "All calendars are already synced";

      return {
        success: true,
        message,
        syncedCalendars: syncedCount,
        totalAvailable: rawCalendars.length,
      };
    } catch (error) {
      this.logger.error(`Failed to refresh calendars: ${error.message}`);
      throw error;
    }
  }

  private async listRawCalendars(
    refreshToken: string,
    provider: CalendarProvider,
  ): Promise<RawCalendar[]> {
    const platform = provider === "google" ? "Google" : "Microsoft";
    const oauthClientId = this.configService.get<string>(
      provider === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID",
    );
    const oauthClientSecret = this.configService.get<string>(
      provider === "google"
        ? "GOOGLE_CLIENT_SECRET"
        : "MICROSOFT_CLIENT_SECRET",
    );

    const result = await this.meetingBaasIntegrationService.listRawCalendars({
      oauthClientId,
      oauthClientSecret,
      oauthRefreshToken: refreshToken,
      platform,
    });

    if (result.success && result.data?.calendars) {
      return result.data.calendars;
    }

    throw new Error(result.message);
  }

  private async createCalendarAndSyncEvents(
    rawCalendar: RawCalendar,
    refreshToken: string,
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
  ): Promise<void> {
    const platform = provider === "google" ? "Google" : "Microsoft";
    const oauthClientId = this.configService.get<string>(
      provider === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID",
    );
    const oauthClientSecret = this.configService.get<string>(
      provider === "google"
        ? "GOOGLE_CLIENT_SECRET"
        : "MICROSOFT_CLIENT_SECRET",
    );

    const result = await this.client.createCalendar({
      oauth_client_id: oauthClientId,
      oauth_client_secret: oauthClientSecret,
      oauth_refresh_token: refreshToken,
      platform,
      raw_calendar_id: rawCalendar.id,
    });

    if (!result.success) {
      throw new Error(`Failed to create calendar: ${result.error.message}`);
    }

    const calendar = result.data.calendar;
    const existingCalendar = await this.calendarsRepository.findOne({
      where: { calender_id: calendar.uuid },
    });

    if (!existingCalendar) {
      await this.calendarsRepository.save({
        id: calendar.uuid,
        calender_id: calendar.uuid,
        name: calendar.name,
        email: calendar.email,
        resource_id: calendar.resource_id,
        organization_id: organizationId,
        profile: { id: userId },
        provider,
        active: true,
      });

      // Call n8n webhook with calendar ID
      try {
        const apiKey = this.configService.get<string>("MEETING_BAAS_API_KEY");
        if (apiKey) {
          const payload = {
            calendar_id: calendar.uuid,
            calendar_name: calendar.name,
            calendar_email: calendar.email,
            organization_id: organizationId,
            user_id: userId,
            provider: provider,
          };

          this.logger.log(
            `Calling n8n webhook get events for organization ${payload.organization_id} with payload: ${JSON.stringify(payload)}`,
          );

          await fetch(
            "https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook/get-events",
            {
              method: "POST",
              headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "x-meeting-baas-api-key": apiKey,
                "User-Agent": "axios/1.8.3",
              },
              body: JSON.stringify(payload),
            },
          );
          this.logger.log(
            `Successfully called n8n webhook for calendar: ${calendar.uuid}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to call n8n webhook for calendar ${calendar.uuid}:`,
          error,
        );
      }

      // await this.syncCalendarEvents(calendar.uuid, userId, organizationId, provider, calendar.email);
    }
  }

  async syncCalendarEvents(
    specificCalendarId?: string,
    userId?: string,
    organizationId?: string,
    provider?: CalendarProvider,
    calendarEmail?: string,
  ): Promise<SyncCalendarEventsResponse> {
    if (!this.client) {
      return {
        success: false,
        message: "MeetingBaas client is not initialized",
      };
    }

    if (!specificCalendarId) {
      return {
        success: false,
        message: "No calendar ID provided",
      };
    }

    try {
      const eventsResult = await this.client.listCalendarEvents({
        calendar_id: specificCalendarId,
        start_date_gte: new Date().toISOString(),
        start_date_lte: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      if (!eventsResult.success) {
        return {
          success: false,
          message: `Failed to fetch events for calendar: ${eventsResult.error.message}`,
        };
      }

      const events = eventsResult.data.data;

      // Create meetings from calendar events
      await this.createMeetingsFromCalendarEvents(
        events,
        userId,
        organizationId,
        provider,
        calendarEmail,
        specificCalendarId,
      );

      // Schedule eligible events
      const eligibleEvents = events.filter(
        (event) => event.meeting_url && event.is_organizer,
      );
      const eventsToSchedule = this.optimizeRecurringEvents(eligibleEvents);

      let calendarEventsScheduled = 0;
      let calendarEventsFailed = 0;

      // Process events in batches of 1000
      const eventBatchSize = 1000;
      for (let j = 0; j < eventsToSchedule.length; j += eventBatchSize) {
        const eventBatch = eventsToSchedule.slice(j, j + eventBatchSize);

        // Process all events in the batch concurrently
        const eventBatchPromises = eventBatch.map(async (event) => {
          try {
            this.logger.log(
              `Attempting to schedule bot for event: ${event.uuid} (${event.name})`,
            );

            const scheduleResult = await this.retryWithBackoff(
              async () => {
                const apiKey = this.configService.get<string>(
                  "MEETING_BAAS_API_KEY",
                );
                if (!apiKey) {
                  throw new Error("MeetingBaas API key is not configured");
                }

                const payload = {
                  bot_name: "Knowted.io",
                  enter_message: "I note it so you can know it",
                  extra: {},
                  recording_mode: "speaker_view",
                  speech_to_text: {
                    provider: "Default",
                  },
                  calendar_id: specificCalendarId,
                };

                this.logger.log(
                  `Calling n8n webhook tp create meetings from calendar events test get events for calendar ${specificCalendarId} with payload: ${JSON.stringify(payload)}`,
                );

                const response = await fetch(
                  `https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook-test/get-events`,
                  {
                    method: "POST",
                    headers: {
                      Accept: "application/json, text/plain, */*",
                      "Content-Type": "application/json",
                      "x-meeting-baas-api-key": apiKey,
                      "User-Agent": "axios/1.8.3",
                    },
                    body: JSON.stringify(payload),
                  },
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(
                    `MeetingBaas API error: ${response.status} ${response.statusText} - ${errorText}`,
                  );
                }

                return await response.json();
              },
              3, // max retries
              1000, // initial delay in ms
            );

            this.logger.log(`Schedule result for event ${event.uuid}:`, {
              success: scheduleResult.success,
              hasData: !!scheduleResult.data,
              dataLength: scheduleResult.data?.length || 0,
              error: scheduleResult.error
                ? JSON.stringify(scheduleResult.error)
                : null,
            });

            return {
              success: scheduleResult.success,
              event,
            };
          } catch (error) {
            this.logger.error(
              `Exception scheduling bot for event ${event.uuid}:`,
              {
                eventId: event.uuid,
                eventName: event.name,
                error: error.message,
                stack: error.stack,
                errorObject: JSON.stringify(
                  error,
                  Object.getOwnPropertyNames(error),
                ),
              },
            );

            return {
              success: false,
              event,
              error: error.message,
            };
          }
        });

        // Wait for all events in the batch to complete
        const eventBatchResults = await Promise.allSettled(eventBatchPromises);

        // Process event batch results
        eventBatchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            const { success } = result.value;
            if (success) {
              calendarEventsScheduled++;
            } else {
              calendarEventsFailed++;
            }
          } else {
            calendarEventsFailed++;
          }
        });
      }

      const results = {
        calendarId: specificCalendarId,
        totalEvents: events.length,
        scheduledEvents: calendarEventsScheduled,
        failedEvents: calendarEventsFailed,
        successRate:
          events.length > 0
            ? `${((calendarEventsScheduled / events.length) * 100).toFixed(2)}%`
            : "N/A",
      };

      return {
        success: true,
        message: `Calendar sync completed for ${specificCalendarId}. Processed ${events.length} events, scheduled ${calendarEventsScheduled} events`,
        data: {
          summary: results,
          calendarId: specificCalendarId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync calendar ${specificCalendarId}: ${error.message}`,
      };
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    initialDelay: number,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = initialDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          {
            error: lastError.message,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private optimizeRecurringEvents(events: Event[]): Event[] {
    const recurringEventsMap = new Map<string, Event[]>();
    const nonRecurringEvents: Event[] = [];

    events.forEach((event) => {
      if (event.is_recurring && event.recurring_event_id) {
        if (!recurringEventsMap.has(event.recurring_event_id)) {
          recurringEventsMap.set(event.recurring_event_id, []);
        }
        recurringEventsMap.get(event.recurring_event_id)!.push(event);
      } else {
        nonRecurringEvents.push(event);
      }
    });

    const optimizedRecurringEvents: Event[] = [];
    recurringEventsMap.forEach((recurringEvents) => {
      if (recurringEvents.length > 0) {
        const sortedEvents = recurringEvents.sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        );
        optimizedRecurringEvents.push(sortedEvents[0]);
      }
    });

    return [...nonRecurringEvents, ...optimizedRecurringEvents];
  }

  private async createMeetingsFromCalendarEvents(
    events: Event[],
    userId: string,
    organizationId: string,
    provider: CalendarProvider,
    calendarEmail?: string,
    calendarId?: string,
  ): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const event of events) {
      try {
        if (!event.meeting_url) {
          skipped++;
          continue;
        }

        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const durationMins = Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60),
        );
        const participantsEmail =
          event.attendees?.map((attendee) => attendee.email) || [];
        const meeting = this.meetingsRepository.create({
          title: event.name,
          host_email: (event as any).organizer.email,
          meeting_date: startTime,
          meeting_url: event.meeting_url,
          participants_email: participantsEmail,
          duration_mins: durationMins,
          bot_id: "",
          chapters: "",
          summary: "",
          summary_meta_data: {},
          thumbnail: "",
          transcript: "",
          transcript_json: {},
          transcript_url: "",
          video_url: "",
          meta_data: {
            event,
          },
          user_id: userId,
          organization_id: organizationId,
          calendar_id: calendarId,
          analysed: false,
        });

        const savedMeeting = await this.meetingsRepository.save(meeting);

        // Track meeting creation
        await this.usageEventsService.logEvent(
          organizationId,
          EventType.MEETING_CREATED,
          userId,
          {
            meetingId: savedMeeting.id,
          },
          1,
        );

        created++;
      } catch (error) {
        errors++;
      }
    }

    return { created, skipped, errors };
  }
}
