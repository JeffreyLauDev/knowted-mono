import {
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { Response } from "express";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { CalendarManageService } from "./calendar-manage.service";
import { CalendarSyncService } from "./calendar-sync.service";
import { CalendarSyncStatusDto } from "./dto/calendar-sync-status.dto";
import { DisconnectCalendarResponseDto } from "./dto/disconnect-calendar.dto";
import { EventSyncStatusResponseDto } from "./dto/event-sync-status.dto";
import { ListMyCalendarsResponseDto } from "./dto/list-my-calendars.dto";
import { CalendarProvider } from "./interfaces/calendar-provider.interface";
import { EventSyncStatusResponse } from "./interfaces/calendar-response.interface";

@ApiTags("Calendar")
@ApiBearerAuth("access-token")
@Controller("api/v1/calendar")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(
    private readonly calendarSyncService: CalendarSyncService,
    private readonly calendarManageService: CalendarManageService,
  ) {}

  @Get("callback")
  @Public()
  @ApiOperation({
    summary: "Handle OAuth callback",
    description: "Handle OAuth callback and exchange code for tokens",
  })
  @ApiQuery({
    name: "code",
    description: "Authorization code from OAuth provider",
  })
  @ApiQuery({
    name: "state",
    description: "State parameter containing user and organization info",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider",
    enum: ["google", "microsoft"],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "OAuth callback processed successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  async handleOAuthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
    @Query("provider") providerParam?: CalendarProvider,
  ) {
    try {
      const result = await this.calendarSyncService.processOAuthCallback(
        code,
        state,
        providerParam,
      );

      if (result.success) {
        // Automatically sync calendars after successful OAuth in the background
        this.logger.log(
          `Starting automatic calendar sync for user ${result.userId} in organization ${result.organizationId} for provider ${result.provider}`,
        );

        // Run calendar sync asynchronously without blocking the redirect
        this.calendarManageService
          .refreshCalendarsByOrganization(
            result.userId,
            result.organizationId,
            result.provider,
          )
          .then(() => {
            this.logger.log(`Automatic calendar sync completed successfully`);
          })
          .catch((syncError) => {
            this.logger.error("Automatic calendar sync failed:", syncError);
            // Don't fail the OAuth process if calendar sync fails
            // The user can manually refresh calendars later
          });

        res.redirect(
          `${process.env.FRONTEND_URL}/calendar-oauth/success?provider=${result.provider}`,
        );
      } else {
        res.redirect(
          `${process.env.FRONTEND_URL}/calendar-oauth/error?message=${encodeURIComponent(
            result.message,
          )}`,
        );
      }
    } catch (error) {
      this.logger.error("OAuth callback error:", error);
      res.redirect(
        `${process.env.FRONTEND_URL}/calendar-oauth/error?message=${encodeURIComponent(
          error.message,
        )}`,
      );
    }
  }

  @Get("generate-oauth-url")
  @RequirePermission("calendar", "readWrite")
  @ApiOperation({
    summary: "Generate OAuth URL for frontend",
    description:
      "Generate OAuth URL for frontend to initiate calendar connection",
  })
  @ApiQuery({ name: "organizationId", description: "Organization ID" })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider",
    enum: ["google", "microsoft"],
  })
  @ApiResponse({
    status: 200,
    description: "OAuth URL generated successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async generateOAuthUrl(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider: CalendarProvider,
  ) {
    return await this.calendarSyncService.generateOAuthUrl(
      user.sub,
      organizationId,
      provider,
    );
  }

  @Get("sync-status")
  @ApiOperation({
    summary: "Get calendar sync status",
    description: "Get the sync status of Google and Microsoft calendars",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar sync status retrieved successfully",
    type: CalendarSyncStatusDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCalendarSyncStatus(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
  ): Promise<CalendarSyncStatusDto> {
    return await this.calendarSyncService.getCalendarSyncStatus(
      user.sub,
      organizationId,
    );
  }

  @Delete("disconnect")
  @RequirePermission("calendar", "readWrite")
  @ApiOperation({
    summary: "Disconnect calendar integration",
    description: "Disconnect calendar integration for a specific provider",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider to disconnect",
    enum: ["google", "microsoft"],
  })
  @ApiResponse({
    status: 200,
    description: "Calendar disconnected successfully",
    type: DisconnectCalendarResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async disconnectCalendar(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider: CalendarProvider,
  ): Promise<DisconnectCalendarResponseDto> {
    const result = await this.calendarManageService.disconnectCalendar(
      user.sub,
      organizationId,
      provider,
    );
    return {
      ...result,
      provider,
    };
  }

  @Get("available-calendars")
  @ApiOperation({
    summary: "List available calendars for selection",
    description:
      "Get a list of available calendars from the connected provider",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider",
    enum: ["google", "microsoft"],
  })
  @ApiResponse({
    status: 200,
    description: "Available calendars retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async listAvailableCalendars(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider: CalendarProvider,
  ) {
    return await this.calendarManageService.listAvailableCalendars(
      user.sub,
      organizationId,
      provider,
    );
  }

  @Get("my-calendars")
  @ApiOperation({
    summary: "List my synced calendars",
    description:
      "Get a list of calendars from the database that are synced for the user",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider (optional)",
    enum: ["google", "microsoft"],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "My calendars retrieved successfully",
    type: ListMyCalendarsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async listMyCalendars(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider?: CalendarProvider,
  ): Promise<ListMyCalendarsResponseDto> {
    return await this.calendarManageService.listMyCalendars(
      user.sub,
      organizationId,
      provider,
    );
  }

  @Get("event-sync-status")
  @ApiOperation({
    summary: "Get event sync status",
    description: "Get detailed information about synced events and calendars",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider (optional)",
    enum: ["google", "microsoft"],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Event sync status retrieved successfully",
    type: EventSyncStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getEventSyncStatus(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider?: CalendarProvider,
  ): Promise<EventSyncStatusResponse> {
    return await this.calendarManageService.getEventSyncStatus(
      user.sub,
      organizationId,
      provider,
    );
  }

  @Post("refresh")
  @RequirePermission("calendar", "readWrite")
  @ApiOperation({
    summary: "Refresh calendars",
    description: "Refresh calendars for the authenticated user",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "provider",
    description: "Calendar provider",
    enum: ["google", "microsoft"],
  })
  @ApiResponse({
    status: 200,
    description: "Calendars refreshed successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async refreshCalendarsByOrganization(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("provider") provider: CalendarProvider,
  ) {
    return await this.calendarManageService.refreshCalendarsByOrganization(
      user.sub,
      organizationId,
      provider,
    );
  }

  @Post("sync")
  @RequirePermission("calendar", "readWrite")
  @ApiOperation({
    summary: "Sync specific calendar",
    description: "Sync a specific calendar",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "calendarId",
    description: "Calendar ID to sync",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar synced successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async syncSpecificCalendar(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("calendarId") calendarId: string,
  ) {
    return await this.calendarSyncService.syncSpecificCalendar(
      user.sub,
      organizationId,
      calendarId,
    );
  }

  @Delete("unsync")
  @RequirePermission("calendar", "readWrite")
  @ApiOperation({
    summary: "Unsync specific calendar",
    description: "Unsync a specific calendar",
  })
  @ApiQuery({
    name: "organizationId",
    description: "Organization ID",
  })
  @ApiQuery({
    name: "calendarId",
    description: "Calendar ID to unsync",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar unsynced successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async unsyncSpecificCalendar(
    @GetUser() user: { sub: string; email: string },
    @Query("organizationId") organizationId: string,
    @Query("calendarId") calendarId: string,
  ) {
    return await this.calendarSyncService.unsyncSpecificCalendar(
      user.sub,
      organizationId,
      calendarId,
    );
  }
}
