import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { Request, Response } from "express";

import { RequireMonthlyMinutes } from "../../common/guards/monthly-minutes.guard";
import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { MeetingBaasIntegrationService } from "../calendar/meetingbaas-integration.service";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import {
  AddToLiveMeetingDto,
  AddToLiveMeetingResponseDto,
} from "./dto/add-to-live-meeting.dto";
import { CompleteMeetingDto } from "./dto/complete-meeting.dto";
import { CreateMeetingShareDto } from "./dto/create-meeting-share.dto";
import { FindMeetingsDto } from "./dto/find-meetings.dto";
import { FindOneMeetingDto } from "./dto/find-one-meeting.dto";
import { FindUpcomingMeetingsDto } from "./dto/find-upcoming-meetings.dto";
import { MeetingResponseDto } from "./dto/meeting-response.dto";
import { MeetingShareResponseDto } from "./dto/meeting-share-response.dto";
import { PaginatedMeetingsResponseDto } from "./dto/paginated-meetings-response.dto";
import { ScheduleMeetingResponseDto } from "./dto/schedule-meeting-response.dto";
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto";
import { UpdateMeetingShareDto } from "./dto/update-meeting-share.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";
import { VideoStreamResponseDto } from "./dto/video-stream.dto";
import { Meetings } from "./entities/meetings.entity";
import { MeetingSharesService } from "./meeting-shares.service";
import { MeetingsService } from "./meetings.service";

@ApiTags("Meetings")
@ApiBearerAuth("access-token")
@Controller("api/v1/meetings")
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingBaasIntegrationService: MeetingBaasIntegrationService,
    private readonly configService: ConfigService,
    private readonly meetingSharesService: MeetingSharesService,
    private readonly logger: PinoLoggerService,
  ) {}

  @Post("schedule")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @RequireMonthlyMinutes()
  @ApiOperation({ summary: "Schedule an upcoming meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "team_id",
    required: false,
    description: "Team ID (optional - assign meeting to team)",
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: "The meeting has been successfully scheduled.",
    type: ScheduleMeetingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  async scheduleMeeting(
    @Body() scheduleMeetingDto: ScheduleMeetingDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Query("team_id") teamId?: string,
  ) {
    const meeting = await this.meetingsService.create({
      name: scheduleMeetingDto.title,
      user_id: userId,
      organization_id: organizationId,
      team_id: teamId,
      settings: {
        meeting_date: scheduleMeetingDto.meeting_date,
        host_email: scheduleMeetingDto.host_email,
        duration: scheduleMeetingDto.duration_mins,
        participants_email: scheduleMeetingDto.participants_email,
        meeting_url: scheduleMeetingDto.meeting_url,
        meeting_type_id: scheduleMeetingDto.meeting_type_id,
        analysed: false,
      },
    });
    return { id: meeting.id };
  }

  @Get()
  @UseGuards(JwtOrApiKeyAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get all meetings with pagination" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "team_id",
    required: false,
    description: "Team ID (optional - filter by team)",
    type: String,
  })
  @ApiQuery({
    name: "meeting_type_id",
    required: false,
    description: "Filter by meeting type ID",
    type: String,
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (0-based, defaults to 0)",
    type: Number,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of items per page (defaults to 20, min: 1, max: 100)",
    type: Number,
  })
  @ApiQuery({
    name: "from_date",
    required: false,
    description: "Filter meetings from this date (ISO string format)",
    type: String,
  })
  @ApiQuery({
    name: "to_date",
    required: false,
    description: "Filter meetings to this date (ISO string format)",
    type: String,
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search query for meeting titles and participant emails",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Return paginated meetings.",
    type: PaginatedMeetingsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  findAll(
    @Query() query: FindMeetingsDto,
    @GetUser("sub") userId: string,
  ): Promise<PaginatedMeetingsResponseDto> {
    return this.meetingsService.findAll(query, userId);
  }
  @Get("upcoming-scheduled")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get upcoming scheduled events for bot joining",
    description:
      "Returns upcoming calendar events that have been scheduled for bot recording",
  })
  @ApiResponse({
    status: 200,
    description: "Upcoming scheduled events retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              meeting_id: { type: "string" },
              title: { type: "string" },
              meeting_date: { type: "string" },
              meeting_url: { type: "string" },
              host_email: { type: "string" },
              participants_email: { type: "array", items: { type: "string" } },
              duration_mins: { type: "number" },
              team_id: { type: "string" },
              organization_id: { type: "string" },
              bot_scheduled: { type: "boolean" },
              bot_status: { type: "string" },
              calendar_provider: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization",
  })
  async getUpcomingScheduledEvents(
    @Query() query: FindUpcomingMeetingsDto,
    @GetUser("sub") userId: string,
  ) {
    return this.meetingsService.getUpcomingScheduledEvents(
      query.organization_id,
      userId,
      {
        limit: query.limit || 10,
        daysAhead: query.days_ahead || 30,
      },
    );
  }

  @Get("next-bot-event")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get the next immediate event that a bot will join",
    description:
      "Returns the next scheduled calendar event that a bot will join for recording",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Next bot event retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            meeting_id: { type: "string" },
            title: { type: "string" },
            meeting_date: { type: "string" },
            meeting_url: { type: "string" },
            host_email: { type: "string" },
            participants_email: { type: "array", items: { type: "string" } },
            duration_mins: { type: "number" },
            team_id: { type: "string" },
            organization_id: { type: "string" },
            bot_scheduled: { type: "boolean" },
            bot_status: { type: "string" },
            calendar_provider: { type: "string" },
            time_until_meeting: { type: "string" },
            meeting_type: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization",
  })
  async getNextBotEvent(
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.meetingsService.getNextBotEvent(organizationId, userId);
  }

  @Get(":id")
  @UseGuards(JwtOrApiKeyAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get a meeting details by id" })
  @ApiResponse({
    status: 200,
    description: "Return the meeting.",
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: "Meeting not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  findOne(
    @Param("id") id: string,
    @Query() query: FindOneMeetingDto,
    @GetUser("sub") userId: string,
  ) {
    return this.meetingsService.findOne(id, query.organization_id, userId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Update a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "The meeting has been successfully updated.",
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: "Meeting not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - No permission to update meeting or not a member of the organization.",
  })
  @RequirePermission("meeting_types", "readWrite")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMeetingDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.meetingsService.updateMeeting(id, dto, userId);
  }

  @Post(":id/complete")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Complete a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "The meeting has been successfully completed.",
    type: MeetingResponseDto,
  })
  @ApiResponse({ status: 404, description: "Meeting not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - No permission to complete meeting or not a member of the organization.",
  })
  @RequirePermission(
    "meeting_types",
    "readWrite",
    (req) => req.body.meeting_type_id,
  )
  completeMeeting(
    @Param("id") id: string,
    @Body() dto: CompleteMeetingDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.meetingsService.completeMeeting(id, dto, userId);
  }

  @Post("add-to-live-meeting")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @RequireMonthlyMinutes()
  @ApiOperation({ summary: "Add to live meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: "Successfully added to live meeting.",
    type: AddToLiveMeetingResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - No permission to add to live meeting or not a member of the organization.",
  })
  @RequirePermission("meeting_types", "readWrite")
  async addToLiveMeeting(
    @Body() dto: AddToLiveMeetingDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<AddToLiveMeetingResponseDto> {
    const result = await this.meetingBaasIntegrationService.addToLiveMeeting({
      meetingName: dto.meetingName,
      meetingLink: dto.meetingLink,
      meetingType: dto.meetingType,
      language: dto.language,
      organizationId: organizationId,
      userId: userId,
    });

    return {
      success: result.success,
      message: result.message,
      botId: result.botId,
      meetingId: result.meetingId,
    };
  }

  @Get(":id/video-url")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get signed video URL for authenticated access",
    description:
      "Get a signed URL to access a meeting's video. Only works for videos stored in Supabase storage.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Signed video URL generated successfully",
    schema: {
      type: "object",
      properties: {
        video_url: { type: "string" },
        expires_in: { type: "number" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Meeting not found or no video" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMeetingVideoUrl(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Query("expires_in") expiresIn: number = 3600,
  ) {
    try {
      const videoUrl = await this.meetingsService.getMeetingVideoUrl(
        meetingId,
        organizationId,
        expiresIn,
      );

      if (!videoUrl) {
        throw new NotFoundException("Meeting not found or no video available");
      }

      return {
        video_url: videoUrl,
        expires_in: expiresIn,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(":id/video-stream")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Stream meeting video with security",
    description:
      "Stream a meeting's video with proper security checks and support for HLS/progressive streaming",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "format",
    required: false,
    description: "Streaming format (hls, dash, progressive)",
    type: String,
    enum: ["hls", "dash", "progressive"],
  })
  @ApiQuery({
    name: "quality",
    required: false,
    description: "Video quality (1080p, 720p, 480p, 360p)",
    type: String,
    enum: ["1080p", "720p", "480p", "360p"],
  })
  @ApiResponse({
    status: 200,
    description: "Video stream",
    content: {
      "video/mp4": {},
      "application/x-mpegURL": {},
      "application/dash+xml": {},
    },
  })
  @ApiResponse({ status: 404, description: "Meeting not found or no video" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async streamMeetingVideo(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Query("format") format: string = "progressive",
    @Query("quality") quality: string = "720p",
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const streamResult = await this.meetingsService.streamMeetingVideo(
        meetingId,
        organizationId,
        userId,
        format,
        quality,
        req.headers.range,
      );

      if (!streamResult) {
        throw new NotFoundException("Meeting not found or no video available");
      }

      // Set appropriate headers based on format
      if (format === "hls") {
        res.setHeader("Content-Type", "application/x-mpegURL");
        res.setHeader("Cache-Control", "public, max-age=3600");
      } else if (format === "dash") {
        res.setHeader("Content-Type", "application/dash+xml");
        res.setHeader("Cache-Control", "public, max-age=3600");
      } else {
        // Progressive streaming
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "private, max-age=3600");

        if (streamResult.contentLength) {
          res.setHeader("Content-Length", streamResult.contentLength);
        }

        if (streamResult.range) {
          res.setHeader(
            "Content-Range",
            `bytes ${streamResult.range.start}-${streamResult.range.end}/${streamResult.contentLength}`,
          );
          res.status(206); // Partial Content
        }
      }

      // Stream the video
      if (streamResult.stream) {
        streamResult.stream.pipe(res);
      } else if (streamResult.url) {
        // Redirect to signed URL for external videos
        res.redirect(streamResult.url);
      }
    } catch (error) {
      this.logger.error("Error streaming meeting video:", error);
      throw error;
    }
  }

  @Get(":id/shared")
  @Public()
  @ApiOperation({ summary: "Get shared meeting data (public endpoint)" })
  @ApiQuery({
    name: "share_token",
    required: true,
    description: "Share token to access the meeting",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Shared meeting data retrieved successfully",
    type: Meetings,
  })
  @ApiResponse({
    status: 404,
    description: "Meeting not found or invalid share token",
  })
  async getSharedMeeting(
    @Param("id") meetingId: string,
    @Query("share_token") shareToken: string,
  ) {
    try {
      // Validate the share token first
      const isValid = await this.meetingSharesService.validateShareToken(
        meetingId,
        shareToken,
      );
      if (!isValid) {
        throw new NotFoundException("Invalid or expired share token");
      }

      // Get the meeting data (this will be a simplified version for public access)
      const meeting = await this.meetingsService.findOneShared(meetingId);
      if (!meeting) {
        throw new NotFoundException("Meeting not found");
      }

      return meeting;
    } catch (error) {
      this.logger.error("Error getting shared meeting:", error);
      throw error;
    }
  }

  @Get(":id/streaming-url")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get secure streaming URL for meeting video",
    description:
      "Get a secure URL for streaming a meeting's video with format and quality options",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "format",
    required: false,
    description: "Streaming format (hls, dash, progressive)",
    type: String,
    enum: ["hls", "dash", "progressive"],
  })
  @ApiQuery({
    name: "quality",
    required: false,
    description: "Video quality (1080p, 720p, 480p, 360p)",
    type: String,
    enum: ["1080p", "720p", "480p", "360p"],
  })
  @ApiResponse({
    status: 200,
    description: "Streaming URL generated successfully",
    type: VideoStreamResponseDto,
  })
  @ApiResponse({ status: 404, description: "Meeting not found or no video" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMeetingStreamingUrl(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Query("format") format: string = "progressive",
    @Query("quality") quality: string = "720p",
  ) {
    try {
      const streamUrl = await this.meetingsService.getMeetingStreamingUrl(
        meetingId,
        organizationId,
        userId,
        format,
        quality,
      );

      if (!streamUrl) {
        throw new NotFoundException("Meeting not found or no video available");
      }

      return {
        streamUrl,
        format,
        quality,
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      throw error;
    }
  }

  @Post("complete-meeting-data")
  @ApiOperation({
    summary: "Complete meeting data with API key authentication",
    description:
      "Submit complete meeting data including transcript, summary, and metadata. Works as upsert - creates new meeting if no meeting_id provided, updates existing if meeting_id provided.",
  })
  @ApiHeader({
    name: "x-api-key",
    description:
      "API key for meeting data submission (configured via MEETING_API_SECRET_PASSWORD environment variable)",
    required: true,
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiQuery({
    name: "user_id",
    required: true,
    description: "User ID",
    type: String,
  })
  @ApiQuery({
    name: "meeting_id",
    required: false,
    description:
      "Meeting ID (optional - if provided, updates existing meeting)",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Meeting data submitted successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        meeting_id: { type: "string" },
        action: { type: "string", enum: ["created", "updated"] },
        meeting_data: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            email_summary: { type: "string" },
            duration_mins: { type: "number" },
            meeting_date: { type: "string" },
            host_email: { type: "string" },
            participants_email: { type: "array", items: { type: "string" } },
            video_url: { type: "string" },
            video_processing_status: { 
              type: "string", 
              enum: ["none", "processing", "completed", "failed"],
              description: "Status of video processing"
            },
            transcript_url: { type: "string" },
            chapters: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Invalid API key" })
  async submitCompleteMeetingData(
    @Headers("x-api-key") apiKey: string,
    @Query("organization_id") organizationId: string,
    @Query("user_id") userId: string,
    @Query("meeting_id") meetingId?: string,
    @Body() meetingData?: any,
  ) {
    // Validate API key
    const expectedApiKey = this.configService.get<string>(
      "MEETING_API_SECRET_PASSWORD",
    );
    if (!expectedApiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Validate required parameters
    if (!organizationId || !userId) {
      throw new UnauthorizedException(
        "organization_id and user_id are required",
      );
    }

    try {
      const result = await this.meetingsService.submitCompleteMeetingData(
        organizationId,
        userId,
        meetingId,
        meetingData,
      );
      return {
        success: true,
        message: "Meeting data submitted successfully",
        meeting_id: result.meeting_id,
        action: result.action,
        meeting_data: {
          title: result.meeting?.title,
          summary: result.meeting?.summary,
          email_summary: result.meeting?.email_summary,
          duration_mins: result.meeting?.duration_mins,
          meeting_date: result.meeting?.meeting_date,
          host_email: result.meeting?.host_email,
          participants_email: result.meeting?.participants_email,
          video_url: result.meeting?.video_url,
          video_processing_status: result.meeting?.video_processing_status,
          transcript_url: result.meeting?.transcript_url,
          chapters: result.meeting?.chapters,
        },
      };
    } catch (error) {
      // Return error response with proper HTTP status
      throw new HttpException(
        {
          success: false,
          message: error.message || "Failed to submit meeting data",
          error: error.toString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Delete a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: "The meeting has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Meeting not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - No permission to delete meeting or not a member of the organization.",
  })
  @RequirePermission("meeting_types", "readWrite")
  async delete(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<void> {
    return this.meetingsService.deleteMeeting(id, organizationId, userId);
  }

  // Meeting Sharing Endpoints
  @Post(":id/share")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Create a share link for a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: "Share link created successfully",
    type: MeetingShareResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  @RequirePermission("meeting_types", "read")
  async createShareLink(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Body() createShareDto: CreateMeetingShareDto,
  ): Promise<MeetingShareResponseDto> {
    // Verify the meeting exists and user has access
    const meeting = await this.meetingsService.findOne(
      meetingId,
      organizationId,
      userId,
    );
    if (!meeting) {
      throw new NotFoundException("Meeting not found or access denied");
    }

    return this.meetingSharesService.createShareLink(createShareDto, userId);
  }

  @Get(":id/share")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get share link for a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Share link retrieved successfully",
    type: MeetingShareResponseDto,
  })
  @ApiResponse({ status: 404, description: "Share link not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  @RequirePermission("meeting_types", "read")
  async getShareLink(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<MeetingShareResponseDto | null> {
    // Verify the meeting exists and user has access
    const meeting = await this.meetingsService.findOne(
      meetingId,
      organizationId,
      userId,
    );
    if (!meeting) {
      throw new NotFoundException("Meeting not found or access denied");
    }

    return this.meetingSharesService.getShareLink(meetingId);
  }

  @Patch(":id/share")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Update share link settings" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Share link updated successfully",
    type: MeetingShareResponseDto,
  })
  @ApiResponse({ status: 404, description: "Share link not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  @RequirePermission("meeting_types", "read")
  async updateShareLink(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Body() updateShareDto: UpdateMeetingShareDto,
  ): Promise<MeetingShareResponseDto> {
    // Verify the meeting exists and user has access
    const meeting = await this.meetingsService.findOne(
      meetingId,
      organizationId,
      userId,
    );
    if (!meeting) {
      throw new NotFoundException("Meeting not found or access denied");
    }

    return this.meetingSharesService.updateShareLink(meetingId, updateShareDto);
  }

  @Delete(":id/share")
  @UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
  @ApiOperation({ summary: "Delete share link for a meeting" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: "Share link deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Share link not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not a member of the organization.",
  })
  @RequirePermission("meeting_types", "read")
  async deleteShareLink(
    @Param("id") meetingId: string,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ): Promise<void> {
    // Verify the meeting exists and user has access
    const meeting = await this.meetingsService.findOne(
      meetingId,
      organizationId,
      userId,
    );
    if (!meeting) {
      throw new NotFoundException("Meeting not found or access denied");
    }

    return this.meetingSharesService.deleteShareLink(meetingId);
  }

  @Get(":id/share/validate")
  @ApiOperation({ summary: "Validate a share token for a meeting" })
  @ApiQuery({
    name: "share_token",
    required: true,
    description: "Share token to validate",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Token validation result",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  async validateShareToken(
    @Param("id") meetingId: string,
    @Query("share_token") shareToken: string,
  ): Promise<{ valid: boolean; message: string }> {
    const isValid = await this.meetingSharesService.validateShareToken(
      meetingId,
      shareToken,
    );

    return {
      valid: isValid,
      message: isValid ? "Token is valid" : "Token is expired",
    };
  }
}
