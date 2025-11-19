import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";

import { MonthlyMinutesResetHistoryDto } from "./dto/monthly-minutes-reset-history.dto";
import { MonthlyMinutesResetDto } from "./dto/monthly-minutes-reset.dto";
import { UsageEventsService } from "./usage-events.service";

@ApiTags("Usage Events")
@ApiBearerAuth("access-token")
@Controller("api/v1/usage")
@UseGuards(JwtAuthGuard, OrganizationMembershipGuard)
export class UsageEventsController {
  constructor(private readonly usageEventsService: UsageEventsService) {}

  @Get("events")
  @ApiOperation({ summary: "Get usage events for an organization" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "event_type",
    required: false,
    description: "Filter by event type",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Returns usage events for the organization",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getEvents(
    @Query("organization_id") organizationId: string,
    @Query("event_type") eventType?: string,
  ) {
    return this.usageEventsService.getEvents(organizationId, eventType as any);
  }

  @Get("summary")
  @ApiOperation({ summary: "Get usage summary for an organization" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "since",
    required: false,
    description: "Filter events since this date (ISO string)",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Returns usage summary for the organization",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUsageSummary(
    @Query("organization_id") organizationId: string,
    @Query("since") since?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.usageEventsService.getUsageSummary(organizationId, sinceDate);
  }

  @Get("metric/:metricType")
  @ApiOperation({ summary: "Get current usage for a specific metric" })
  @ApiParam({
    name: "metricType",
    required: true,
    description: "The metric type to get usage for",
    type: String,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "since",
    required: false,
    description: "Filter events since this date (ISO string)",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Returns current usage for the specified metric",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCurrentUsage(
    @Param("metricType") metricType: string,
    @Query("organization_id") organizationId: string,
    @Query("since") since?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    const usage = await this.usageEventsService.getCurrentUsage(
      organizationId,
      metricType,
      sinceDate,
    );
    return {
      metricType,
      organizationId,
      currentUsage: usage,
      since: sinceDate,
    };
  }

  @Post("monthly-minutes/reset")
  @ApiOperation({
    summary: "Reset monthly minutes usage for an organization (Admin only)",
    description:
      "Manually reset the monthly minutes usage counter for a specific organization. This is typically used for admin overrides or plan changes.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to reset usage for",
    type: String,
  })
  @ApiQuery({
    name: "reason",
    required: false,
    description:
      "Reason for the reset (e.g., 'plan_upgrade', 'admin_override', 'billing_correction')",
    type: String,
  })
  @ApiOkResponse({
    description: "Monthly minutes usage reset successfully",
    type: MonthlyMinutesResetDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async resetMonthlyMinutesUsage(
    @Query("organization_id") organizationId: string,
    @Query("reason") reason: string = "admin_override",
  ) {
    return this.usageEventsService.resetMonthlyMinutesUsage(
      organizationId,
      reason,
    );
  }

  @Get("monthly-minutes/reset-history")
  @ApiOperation({
    summary: "Get monthly minutes reset history for an organization",
    description:
      "Retrieve the history of monthly minutes resets for audit purposes.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID to get reset history for",
    type: String,
  })
  @ApiOkResponse({
    description: "Reset history retrieved successfully",
    type: MonthlyMinutesResetHistoryDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMonthlyMinutesResetHistory(
    @Query("organization_id") organizationId: string,
  ) {
    return this.usageEventsService.getMonthlyMinutesResetHistory(
      organizationId,
    );
  }
}
