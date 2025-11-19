import * as http from "http";
import * as https from "https";

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { Between, In, Repository } from "typeorm";

import { SupabaseService } from "@/modules/supabase/supabase.service";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { CalendarSyncService } from "../calendar/calendar-sync.service";
import { MeetingBaasIntegrationService } from "../calendar/meetingbaas-integration.service";
import { EmailService } from "../email/email.service";
import { MeetingType } from "../meeting_types/entities/meeting_types.entity";
import { Organizations } from "../organizations/entities/organizations.entity";
import { PermissionsService } from "../permissions/permissions.service";
import { ProfilesService } from "../profiles/profiles.service";
import { TeamsService } from "../teams/teams.service";
import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";
import { WebhookNotificationService } from "../webhooks/webhook-notification.service";

import { CompleteMeetingDto } from "./dto/complete-meeting.dto";
import { CreateMeetingsDto } from "./dto/create-meetings.dto";
import { FindMeetingsDto } from "./dto/find-meetings.dto";
import { PaginatedMeetingsResponseDto } from "./dto/paginated-meetings-response.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";
import { Meetings } from "./entities/meetings.entity";
import { MeetingSharesService } from "./meeting-shares.service";

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meetings)
    private meetingsRepository: Repository<Meetings>,
    @InjectRepository(Organizations)
    private organizationsRepository: Repository<Organizations>,
    private permissionsService: PermissionsService,
    private profilesService: ProfilesService,
    private teamsService: TeamsService,
    private usageEventsService: UsageEventsService,
    private meetingBaasIntegrationService: MeetingBaasIntegrationService,
    private calendarSyncService: CalendarSyncService,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
    private meetingSharesService: MeetingSharesService,
    private emailService: EmailService,
    private logger: PinoLoggerService,
    private webhookNotificationService: WebhookNotificationService,
  ) {}

  async create(createMeetingsDto: CreateMeetingsDto) {
    const meetings = this.meetingsRepository.create({
      title: createMeetingsDto.name,
      meta_data: {
        description: createMeetingsDto.description,
        is_active: createMeetingsDto.is_active,
        ...createMeetingsDto.settings,
      },
      analysed: false,
      bot_id: "",
      chapters: "",
      duration_mins: 0,
      host_email: "",
      meeting_date: new Date().toISOString(),
      meeting_url: "",
      participants_email: [],
      summary: "",
      summary_meta_data: {},
      thumbnail: "",
      transcript: "",
      transcript_json: {},
      transcript_url: "",
      video_url: "",
      user_id: createMeetingsDto.user_id,
      profile: { id: createMeetingsDto.user_id },
      organization: { id: createMeetingsDto.organization_id },
      calendar_id: createMeetingsDto.calendar_id,
      ...(createMeetingsDto.team_id && {
        team: { id: createMeetingsDto.team_id },
      }),
    });

    const savedMeeting = await this.meetingsRepository.save(meetings);

    // Track meeting creation
    await this.usageEventsService.logEvent(
      createMeetingsDto.organization_id,
      EventType.MEETING_CREATED,
      createMeetingsDto.user_id,
      {
        meetingId: savedMeeting.id,
      },
      1,
    );

    return savedMeeting;
  }

  async findAll(
    query: FindMeetingsDto,
    userId: string,
  ): Promise<PaginatedMeetingsResponseDto> {
    // Get all teams for the user in the organization
    const teams = await this.teamsService.getUserTeams(
      query.organization_id,
      userId,
    );

    // If user has no teams, deny access and log error
    if (!teams || teams.length === 0) {
      // Check if user is organization owner for logging purposes
      const organization = await this.organizationsRepository.findOne({
        where: { id: query.organization_id },
        select: ["owner_id"],
      });

      const isOwner = organization?.owner_id === userId;

      // Log error: User has no teams - this is a critical organizational structure issue
      this.logger.error(
        "CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention",
        undefined,
        "MeetingsService",
        {
          organizationId: query.organization_id,
          userId,
          ownerId: organization?.owner_id,
          isOwner,
          issue: isOwner 
            ? "Organization owner is not part of any team - this breaks the security model"
            : "User is not part of any team and not organization owner",
        },
      );

      throw new UnauthorizedException(
        "User must be part of a team to access meetings",
      );
    }

    // Use SQL JOINs to filter meetings by permissions at database level
    const teamIds = teams.map((team) => team.id);

    // Build the query with JOINs for permission checking
    const queryBuilder = this.meetingsRepository
      .createQueryBuilder("meeting")
      .leftJoin("meeting.meetingType", "meetingType")
      .leftJoin("meeting.team", "team")
      .leftJoin(
        "permissions",
        "permission",
        "permission.team_id IN (:...teamIds) AND " +
          "permission.resource_type = :resourceType AND " +
          "(permission.resource_id = meetingType.id OR permission.resource_id IS NULL)",
        { teamIds, resourceType: "meeting_types" },
      )
      .where("meeting.organization_id = :organizationId", {
        organizationId: query.organization_id,
      })
      .andWhere("meeting.analysed = :analysed", { analysed: true })
      .andWhere("(meetingType.id IS NULL OR permission.id IS NOT NULL)");

    // Add meeting type filter if specified
    if (query.meeting_type_id) {
      queryBuilder.andWhere("meetingType.id = :meetingTypeId", {
        meetingTypeId: query.meeting_type_id,
      });
    }

    // Add team filter if specified
    if (query.team_id) {
      queryBuilder.andWhere("team.id = :teamId", { teamId: query.team_id });
    }

    // Add date range filtering
    if (query.from_date || query.to_date) {
      if (query.from_date && query.to_date) {
        queryBuilder.andWhere(
          "meeting.meeting_date BETWEEN :fromDate AND :toDate",
          {
            fromDate: query.from_date,
            toDate: query.to_date,
          },
        );
      } else if (query.from_date) {
        queryBuilder.andWhere("meeting.meeting_date >= :fromDate", {
          fromDate: query.from_date,
        });
      } else if (query.to_date) {
        queryBuilder.andWhere("meeting.meeting_date <= :toDate", {
          toDate: query.to_date,
        });
      }
    }

    // Add search filtering
    if (query.search) {
      queryBuilder.andWhere("meeting.title ILIKE :search", {
        search: `%${query.search}%`,
      });
    }

    // Get paginated results and total count in a single query
    const [meetings, total] = await queryBuilder
      .select([
        "meeting.id",
        "meeting.analysed",
        "meeting.duration_mins",
        "meeting.host_email",
        "meeting.meeting_date",
        "meeting.meeting_url",
        "meeting.created_at",
        "meeting.participants_email",
        "meeting.thumbnail",
        "meeting.title",
        "meeting.video_processing_status",
        "meetingType.id",
        "meetingType.name",
        "team.id",
        "team.name",
      ])
      .orderBy("meeting.meeting_date", "DESC")
      .addOrderBy("meeting.created_at", "DESC")
      .skip((query.page || 0) * (query.limit || 20))
      .take(query.limit || 20)
      .getManyAndCount();

    const page = query.page || 0;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: meetings,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
    };
  }

  async findOne(id: string, organizationId: string, userId: string) {
    // Get all teams for the user in the organization
    const teams = await this.teamsService.getUserTeams(organizationId, userId);

    if (!teams || teams.length === 0) {
      return null;
    }

    // Get the meeting with its meeting type
    const meeting = await this.meetingsRepository.findOne({
      where: {
        id,
        organization: { id: organizationId },
      },
      relations: ["meetingType", "organization"],
      select: {
        id: true,
        analysed: true,
        bot_id: true,
        chapters: true,
        host_email: true,
        meeting_url: true,
        meta_data: true,
        participants_email: true,
        summary: true,
        summary_meta_data: true,
        thumbnail: true,
        title: true,
        transcript: true,
        transcript_json: true,
        transcript_url: true,
        video_url: true,
        video_processing_status: true,
        created_at: true,
        updated_at: true,
        duration_mins: true,
        meeting_date: true,
        organization: {
          id: true,
        },
        meetingType: {
          id: true,
          name: true,
        },
      },
    });

    if (!meeting) {
      return null;
    }

    // Check permissions for all teams
    const permissionChecks = await Promise.all(
      teams.map((team) =>
        this.permissionsService.checkPermission(
          team.id,
          "meeting_types",
          meeting.meetingType.id,
          "read",
        ),
      ),
    );

    // If any team has permission, return the meeting
    if (permissionChecks.some((hasPermission) => hasPermission)) {
      return meeting;
    }

    return null;
  }

  async updateMeeting(
    meetingId: string,
    dto: UpdateMeetingDto | CompleteMeetingDto,
    userId: string,
  ) {
    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
      relations: ["meetingType", "organization"],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    const { meeting_type_id, meeting_date, ...updateFields } = dto;

    const updateData: Partial<Meetings> = {
      ...updateFields,
      ...(meeting_type_id && {
        meetingType: { id: meeting_type_id } as MeetingType,
      }),
      ...(meeting_date && { meeting_date: new Date(meeting_date) }),
      ...(dto instanceof CompleteMeetingDto && { analysed: true }),
    };

    await this.meetingsRepository.update(meetingId, updateData);
    return this.findOne(meetingId, meeting.organization.id, userId);
  }

  async completeMeeting(
    meetingId: string,
    dto: CompleteMeetingDto,
    userId: string,
  ): Promise<Meetings> {
    const meeting = await this.updateMeeting(meetingId, dto, userId);

    // Track meeting completion
    await this.usageEventsService.logEvent(
      meeting.organization.id,
      EventType.MEETING_COMPLETED,
      userId,
      {
        meetingId: meetingId,
        duration: dto.duration_mins,
      },
      1,
    );

    // Track call minutes usage
    if (dto.duration_mins && dto.duration_mins > 0) {
      await this.usageEventsService.trackCallMinutesUsed(
        meeting.organization.id,
        userId,
        dto.duration_mins,
      );
    }

    // Send meeting analysis email to all participants
    try {
      // Get the updated meeting with organization details
      const updatedMeeting = await this.meetingsRepository.findOne({
        where: { id: meetingId },
        relations: ["organization"],
      });

      if (updatedMeeting && updatedMeeting.organization) {
        // Create or get share link for the meeting
        let shareUrl: string | undefined;
        try {
          let shareLink =
            await this.meetingSharesService.getShareLink(meetingId);

          // If no share link exists, create one
          if (!shareLink) {
            shareLink = await this.meetingSharesService.createShareLink(
              { meeting_id: meetingId },
              updatedMeeting.user_id || "system",
            );
          }

          if (shareLink) {
            const frontendUrl =
              this.configService.get<string>("FRONTEND_URL") ||
              "http://localhost:3000";
            shareUrl = `${frontendUrl}/shared/${meetingId}?token=${shareLink.share_token}`;
          }
        } catch (error) {
          this.logger.error(
            "Failed to get or create share link for meeting:",
            error,
          );
        }

        // Get the meeting owner's email
        let ownerEmail: string | undefined;
        try {
          if (updatedMeeting.user_id) {
            const ownerProfile = await this.profilesService.getProfile(
              updatedMeeting.user_id,
            );
            ownerEmail = ownerProfile.email || undefined;
          }
        } catch (error) {
          this.logger.error("Failed to get meeting owner's email:", error);
        }

        await this.emailService.sendMeetingAnalysisEmail(
          {
            title: updatedMeeting.title || "Untitled Meeting",
            summary: updatedMeeting.summary || "",
            duration_mins: updatedMeeting.duration_mins || 0,
            meeting_date: updatedMeeting.meeting_date || new Date(),
            host_email: updatedMeeting.host_email || "",
            participants_email: updatedMeeting.participants_email || [],
            owner_email: ownerEmail,
            video_url: updatedMeeting.video_url,
            transcript_url: updatedMeeting.transcript_url,
            chapters: updatedMeeting.chapters,
            shareUrl: shareUrl,
            meetingId: meetingId,
          },
          updatedMeeting.organization.name || "Your Organization",
        );
      }
    } catch (error) {
      // Log error but don't fail the meeting completion
      this.logger.error("Failed to send meeting analysis email:", error);
    }

    return meeting;
  }

  async deleteMeeting(
    meetingId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    // Get all teams for the user in the organization
    const teams = await this.teamsService.getUserTeams(organizationId, userId);

    // If user has no teams, deny access and log error
    if (!teams || teams.length === 0) {
      // Check if user is organization owner for logging purposes
      const organization = await this.organizationsRepository.findOne({
        where: { id: organizationId },
        select: ["owner_id"],
      });

      const isOwner = organization?.owner_id === userId;

      // Log error: User has no teams - this is a critical organizational structure issue
      this.logger.error(
        "CRITICAL: User has no teams - this indicates a serious organizational structure issue that needs immediate attention",
        undefined,
        "MeetingsService",
        {
          organizationId,
          userId,
          ownerId: organization?.owner_id,
          isOwner,
          issue: isOwner 
            ? "Organization owner is not part of any team - this breaks the security model"
            : "User is not part of any team and not organization owner",
        },
      );

      throw new UnauthorizedException(
        "User must be part of a team to delete meetings",
      );
    }

    // Get the meeting with its meeting type
    const meeting = await this.meetingsRepository.findOne({
      where: {
        id: meetingId,
        organization: { id: organizationId },
      },
      relations: ["meetingType"],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    // Check permissions for all teams
    const permissionChecks = await Promise.all(
      teams.map((team) =>
        this.permissionsService.checkPermission(
          team.id,
          "meeting_types",
          meeting.meetingType.id,
          "readWrite",
        ),
      ),
    );

    // If no team has write permission, throw an error
    if (!permissionChecks.some((hasPermission) => hasPermission)) {
      throw new NotFoundException(
        "You don't have permission to delete this meeting",
      );
    }

    // Delete the meeting
    await this.meetingsRepository.delete(meetingId);
  }

  async findUnanalyzedMeetingsByCalendarId(
    calendarId: string,
  ): Promise<Meetings[]> {
    return this.meetingsRepository.find({
      where: {
        calendar_id: calendarId,
        analysed: false,
      },
    });
  }

  async deleteMany(meetingIds: string[]): Promise<void> {
    if (meetingIds.length === 0) {
      return;
    }

    // Delete meetings from MeetingBaas if they have bot_ids
    const meetings = await this.meetingsRepository.find({
      where: { id: In(meetingIds) },
    });

    for (const meeting of meetings) {
      if (meeting.bot_id) {
        try {
          // Call n8n webhook to delete calendar data instead of using MeetingBaas SDK
          if (meeting.calendar_id) {
            const payload = {
              calendar_id: meeting.calendar_id,
              bot_id: meeting.bot_id,
            };

            this.logger.log(
              `Calling n8n webhook delete calendar for meeting ${meeting.id} with payload: ${JSON.stringify(payload)}`,
            );

            const response = await fetch(
              "https://n8n-app-platform-01-957yy.ondigitalocean.app/webhook/delete_calendar",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "axios/1.8.3",
                },
                body: JSON.stringify(payload),
              },
            );

            if (!response.ok) {
              this.logger.error(
                `Failed to delete calendar data for meeting ${meeting.id}: HTTP ${response.status}`,
              );
            } else {
            }
          } else {
          }
        } catch (error) {
          // Log error but don't fail the deletion
          this.logger.error(
            `Failed to delete calendar data for meeting ${meeting.id}:`,
            error,
          );
        }
      }
    }

    // Delete meetings from database
    await this.meetingsRepository.delete({ id: In(meetingIds) });
  }

  async getUpcomingScheduledEvents(
    organizationId: string,
    userId: string,
    options: {
      limit?: number;
      daysAhead?: number;
    } = {},
  ) {
    try {
      const { limit = 10, daysAhead = 30 } = options;

      // Get all teams for the user in the organization
      const teams = await this.teamsService.getUserTeams(
        organizationId,
        userId,
      );

      if (!teams || teams.length === 0) {
        return {
          success: true,
          message: "No teams found for user",
          data: [],
        };
      }

      // Calculate date range
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + daysAhead);

      // Get calendars for this organization
      const organizationCalendars =
        await this.calendarSyncService.findByOrganizationId(organizationId);

      if (!organizationCalendars || organizationCalendars.length === 0) {
        // Fall back to local database approach
        const upcomingMeetings = await this.meetingsRepository.find({
          where: {
            organization_id: organizationId,
            meeting_date: Between(now, endDate),
            team_id: In(teams.map((team) => team.id)),
          },
          relations: ["meetingType", "team"],
          select: {
            id: true,
            title: true,
            meeting_date: true,
            meeting_url: true,
            host_email: true,
            participants_email: true,
            duration_mins: true,
            team_id: true,
            organization_id: true,
            analysed: true,
            bot_id: true,
            meetingType: {
              id: true,
              name: true,
            },
          },
          order: {
            meeting_date: "ASC",
          },
          take: limit,
        });

        if (!upcomingMeetings || upcomingMeetings.length === 0) {
          return {
            success: true,
            message: "No upcoming scheduled events found",
            data: [],
          };
        }

        // Transform local database meetings to our format
        const transformedMeetings = upcomingMeetings.map((meeting) => ({
          meeting_id: meeting.id,
          title: meeting.title,
          meeting_date: meeting.meeting_date,
          meeting_url: meeting.meeting_url,
          host_email: meeting.host_email,
          participants_email: meeting.participants_email,
          duration_mins: meeting.duration_mins,
          team_id: meeting.team_id,
          organization_id: meeting.organization_id,
          bot_scheduled: !!meeting.bot_id,
          bot_status: meeting.analysed
            ? "completed"
            : meeting.bot_id
              ? "scheduled"
              : "not_scheduled",
          calendar_provider: this.detectCalendarProvider(meeting.meeting_url),
          meeting_type: meeting.meetingType?.name || "Unknown",
        }));

        // Filter meetings based on permissions
        const accessibleMeetings = await Promise.all(
          transformedMeetings.map(async (meeting) => {
            try {
              const permissionChecks = await Promise.all(
                teams.map((team) =>
                  this.permissionsService.checkPermission(
                    team.id,
                    "meeting_types",
                    meeting.meeting_type || "",
                    "read",
                  ),
                ),
              );

              if (permissionChecks.some((hasPermission) => hasPermission)) {
                return meeting;
              }
              return null;
            } catch (error) {
              this.logger.error(
                `Error checking permissions for meeting ${meeting.meeting_id}:`,
                error,
              );
              return null;
            }
          }),
        );

        const validMeetings = accessibleMeetings.filter(
          (meeting): meeting is any => meeting !== null,
        );

        return {
          success: true,
          message: `Found ${validMeetings.length} upcoming scheduled events from local database`,
          data: validMeetings,
        };
      }

      // Get upcoming meetings from MeetingBass using organization calendars (concurrent)
      const calendarPromises = organizationCalendars.map(async (calendar) => {
        try {
          const meetingBaasResult =
            await this.meetingBaasIntegrationService.listCalendarEvents({
              calendarId: calendar.calender_id, // Use the actual calendar ID from database
              startDateGte: now.toISOString(),
              startDateLte: endDate.toISOString(),
              status: "upcoming",
            });

          if (meetingBaasResult.success && meetingBaasResult.data) {
            return meetingBaasResult.data;
          } else {
            return [];
          }
        } catch (error) {
          this.logger.error(
            `Error fetching events for calendar ${calendar.calender_id}:`,
            error,
          );
          return [];
        }
      });

      // Wait for all calendar requests to complete concurrently
      const calendarResults = await Promise.all(calendarPromises);

      // Flatten all results into a single array
      const allMeetingBaasEvents = calendarResults.flat();

      if (allMeetingBaasEvents.length === 0) {
        return {
          success: true,
          message:
            "No upcoming scheduled events found in MeetingBass calendars",
          data: [],
        };
      }

      // Sort events by start time and take the limit
      const sortedEvents = allMeetingBaasEvents
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        )
        .slice(0, limit);

      // Debug: Log the first event to see the structure
      if (sortedEvents.length > 0) {
        this.logger.log(
          "Sample MeetingBass event structure:",
          "MeetingsService",
          { eventStructure: JSON.stringify(sortedEvents[0], null, 2) },
        );
        this.logger.log("All events have same ID:", "MeetingsService", {
          allEventsSameId: sortedEvents.every(
            (e) => e.uuid === sortedEvents[0].uuid,
          ),
        });
      }

      // Transform MeetingBass events to our format with better field mapping
      const upcomingMeetings = sortedEvents.map((event: any) => {
        // Extract meeting details with fallbacks
        const meetingId =
          event.uuid || event.id || event.event_id || `event_${Date.now()}`;
        const title =
          event.name || event.title || event.summary || "Untitled Meeting";
        const meetingDate =
          event.start_time ||
          event.start_date ||
          event.start ||
          event.created_at;
        const meetingUrl =
          event.meeting_url ||
          event.join_url ||
          event.hangout_link ||
          event.html_link;
        const hostEmail =
          event.organizer?.email || event.host_email || event.creator?.email;
        const attendees = event.attendees || event.participants || [];
        const participantsEmail = Array.isArray(attendees)
          ? attendees.map(
              (attendee: any) =>
                attendee.email || attendee.mailto || attendee.address,
            )
          : [];
        const durationMins = event.duration_minutes || event.duration || 60; // Default to 60 minutes
        const teamId = event.extra?.team_id || event.team_id || null;
        const botScheduled = !!(event.bot_data?.bot_id || event.bot_id);
        const botStatus =
          event.bot_data?.status || event.bot_status || "not_scheduled";
        const calendarProvider = this.detectCalendarProvider(meetingUrl);
        const meetingType =
          event.extra?.meeting_type || event.meeting_type || "Unknown";

        return {
          meeting_id: meetingId,
          title: title,
          meeting_date: meetingDate,
          meeting_url: meetingUrl,
          host_email: hostEmail,
          participants_email: participantsEmail,
          duration_mins: durationMins,
          team_id: teamId,
          organization_id: organizationId,
          bot_scheduled: botScheduled,
          bot_status: botStatus,
          calendar_provider: calendarProvider,
          meeting_type: meetingType,
        };
      });

      // Filter meetings based on permissions (if teams are specified in events)
      const accessibleMeetings = await Promise.all(
        upcomingMeetings.map(async (meeting) => {
          try {
            // If meeting has a team_id, check permissions
            if (meeting.team_id) {
              const permissionChecks = await Promise.all(
                teams.map((team) =>
                  this.permissionsService.checkPermission(
                    team.id,
                    "meeting_types",
                    meeting.meeting_type || "",
                    "read",
                  ),
                ),
              );

              // If any team has permission, include the meeting
              if (permissionChecks.some((hasPermission) => hasPermission)) {
                return meeting;
              }
              return null;
            } else {
              // If no team_id, include the meeting (user has access to organization)
              return meeting;
            }
          } catch (error) {
            this.logger.error(
              `Error checking permissions for meeting ${meeting.meeting_id}:`,
              error,
            );
            return null;
          }
        }),
      );

      // Remove null values (meetings without permission)
      const validMeetings = accessibleMeetings.filter(
        (meeting): meeting is any => meeting !== null,
      );

      return {
        success: true,
        message: `Found ${validMeetings.length} upcoming scheduled events from MeetingBass`,
        data: validMeetings,
      };
    } catch (error) {
      this.logger.error(
        "Error getting upcoming scheduled events from MeetingBass:",
        error,
      );
      return {
        success: false,
        message:
          "Failed to retrieve upcoming scheduled events from MeetingBass",
        data: [],
      };
    }
  }

  async getNextBotEvent(organizationId: string, userId: string) {
    try {
      // Get all teams for the user in the organization
      const teams = await this.teamsService.getUserTeams(
        organizationId,
        userId,
      );

      if (!teams || teams.length === 0) {
        return {
          success: true,
          message: "No teams found for user",
          data: null,
        };
      }

      // Calculate date range (next 7 days)
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + 7);

      // Get calendars for this organization
      const organizationCalendars =
        await this.calendarSyncService.findByOrganizationId(organizationId);

      if (!organizationCalendars || organizationCalendars.length === 0) {
        // Fall back to local database approach
        const nextMeeting = await this.meetingsRepository.findOne({
          where: {
            organization_id: organizationId,
            meeting_date: Between(now, endDate),
            team_id: In(teams.map((team) => team.id)),
          },
          relations: ["meetingType", "team"],
          select: {
            id: true,
            title: true,
            meeting_date: true,
            meeting_url: true,
            host_email: true,
            participants_email: true,
            duration_mins: true,
            team_id: true,
            organization_id: true,
            analysed: true,
            bot_id: true,
            meetingType: {
              id: true,
              name: true,
            },
          },
          order: {
            meeting_date: "ASC",
          },
        });

        if (!nextMeeting) {
          return {
            success: true,
            message: "No upcoming scheduled events found",
            data: null,
          };
        }

        // Check permissions
        const permissionChecks = await Promise.all(
          teams.map((team) =>
            this.permissionsService.checkPermission(
              team.id,
              "meeting_types",
              nextMeeting.meetingType?.id || "",
              "read",
            ),
          ),
        );

        if (!permissionChecks.some((hasPermission) => hasPermission)) {
          return {
            success: false,
            message: "No permission to view this meeting",
            data: null,
          };
        }

        // Calculate time until meeting
        const meetingDate = new Date(nextMeeting.meeting_date);
        const timeUntilMeeting = this.calculateTimeUntilMeeting(meetingDate);

        return {
          success: true,
          message: "Next bot event retrieved successfully from local database",
          data: {
            meeting_id: nextMeeting.id,
            title: nextMeeting.title,
            meeting_date: nextMeeting.meeting_date,
            meeting_url: nextMeeting.meeting_url,
            host_email: nextMeeting.host_email,
            participants_email: nextMeeting.participants_email,
            duration_mins: nextMeeting.duration_mins,
            team_id: nextMeeting.team_id,
            organization_id: nextMeeting.organization_id,
            bot_scheduled: !!nextMeeting.bot_id,
            bot_status: nextMeeting.analysed
              ? "completed"
              : nextMeeting.bot_id
                ? "scheduled"
                : "not_scheduled",
            calendar_provider: this.detectCalendarProvider(
              nextMeeting.meeting_url,
            ),
            meeting_type: nextMeeting.meetingType?.name || "Unknown",
            time_until_meeting: timeUntilMeeting,
          },
        };
      }

      // Get upcoming meetings from MeetingBass using organization calendars (concurrent)
      const calendarPromises = organizationCalendars.map(async (calendar) => {
        try {
          const meetingBaasResult =
            await this.meetingBaasIntegrationService.listCalendarEvents({
              calendarId: calendar.calender_id, // Use the actual calendar ID from database
              startDateGte: now.toISOString(),
              startDateLte: endDate.toISOString(),
              status: "upcoming",
            });

          if (meetingBaasResult.success && meetingBaasResult.data) {
            return meetingBaasResult.data;
          } else {
            return [];
          }
        } catch (error) {
          this.logger.error(
            `Error fetching events for calendar ${calendar.calender_id}:`,
            error,
          );
          return [];
        }
      });

      // Wait for all calendar requests to complete concurrently
      const calendarResults = await Promise.all(calendarPromises);

      // Flatten all results into a single array
      const allMeetingBaasEvents = calendarResults.flat();

      if (allMeetingBaasEvents.length === 0) {
        return {
          success: true,
          message:
            "No upcoming scheduled events found in MeetingBass calendars",
          data: null,
        };
      }

      // Get the first (earliest) meeting
      const sortedEvents = allMeetingBaasEvents.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

      const nextEvent = sortedEvents[0];

      // Check permissions (if team_id is specified)
      const teamId = (nextEvent.raw as any)?.team_id || null;
      const meetingType = (nextEvent.raw as any)?.meeting_type || "Unknown";

      if (teamId) {
        const permissionChecks = await Promise.all(
          teams.map((team) =>
            this.permissionsService.checkPermission(
              team.id,
              "meeting_types",
              meetingType,
              "read",
            ),
          ),
        );

        if (!permissionChecks.some((hasPermission) => hasPermission)) {
          return {
            success: false,
            message: "No permission to view this meeting",
            data: null,
          };
        }
      }

      // Calculate time until meeting
      const meetingDate = new Date(nextEvent.start_time);
      const timeUntilMeeting = this.calculateTimeUntilMeeting(meetingDate);

      return {
        success: true,
        message: "Next bot event retrieved successfully from MeetingBaas",
        data: {
          ...nextEvent,
          time_until_meeting: timeUntilMeeting,
        },
      };
    } catch (error) {
      this.logger.error(
        "Error getting next bot event from MeetingBass:",
        error,
      );
      return {
        success: false,
        message: "Failed to retrieve next bot event from MeetingBass",
        data: null,
      };
    }
  }

  async submitCompleteMeetingData(
    organizationId: string,
    userId: string,
    meetingId?: string,
    meetingData?: any,
  ) {
    try {
      let meeting: Meetings;
      let action: "created" | "updated";

      if (meetingId) {
        // Update existing meeting - only load necessary fields for validation
        meeting = await this.meetingsRepository.findOne({
          where: { id: meetingId, organization: { id: organizationId } },
          relations: ["organization"],
        });

        if (!meeting) {
          throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
        }

        action = "updated";
      } else {
        // Create new meeting
        meeting = this.meetingsRepository.create({
          title: meetingData?.title || "Untitled Meeting",
          meta_data: meetingData?.meta_data || {},
          analysed: true,
          bot_id: meetingData?.bot_id || "",
          chapters: meetingData?.chapters || "",
          duration_mins: meetingData?.duration_mins || 0,
          host_email: meetingData?.host_email || "",
          meeting_date: meetingData?.meeting_date
            ? new Date(meetingData.meeting_date)
            : new Date(),
          meeting_url: meetingData?.meeting_url || "",
          participants_email: Array.isArray(meetingData?.participants_email)
            ? meetingData.participants_email.filter(
                (email) => typeof email === "string" && email.trim().length > 0,
              )
            : [],
          summary: meetingData?.summary || "",
          email_summary: meetingData?.email_summary || "",
          summary_meta_data: meetingData?.summary_meta_data || {},
          thumbnail: meetingData?.thumbnail || "",
          transcript: meetingData?.transcript || "",
          transcript_json: meetingData?.transcript_json || {},
          transcript_url: meetingData?.transcript_url || "",
          video_url: meetingData?.video_url || "",
          user_id: userId,
          profile: { id: userId },
          organization: { id: organizationId },
          calendar_id: meetingData?.calendar_id || "",
          team_id: meetingData?.team_id || null,
          meetingType: meetingData?.meeting_type_id
            ? ({ id: meetingData.meeting_type_id } as MeetingType)
            : null,
        });

        action = "created";
      }

      // Update meeting data if provided
      if (meetingData) {
        if (meetingData.title) meeting.title = meetingData.title;
        if (meetingData.meta_data)
          meeting.meta_data = {
            ...meeting.meta_data,
            ...meetingData.meta_data,
          };
        if (meetingData.summary) meeting.summary = meetingData.summary;
        if (meetingData.email_summary)
          meeting.email_summary = meetingData.email_summary;
        if (meetingData.summary_meta_data)
          meeting.summary_meta_data = {
            ...meeting.summary_meta_data,
            ...meetingData.summary_meta_data,
          };
        if (meetingData.transcript) meeting.transcript = meetingData.transcript;
        if (meetingData.transcript_json)
          meeting.transcript_json = {
            ...meeting.transcript_json,
            ...meetingData.transcript_json,
          };
        if (meetingData.transcript_url)
          meeting.transcript_url = meetingData.transcript_url;
        if (meetingData.thumbnail) meeting.thumbnail = meetingData.thumbnail;
        if (meetingData.chapters) meeting.chapters = meetingData.chapters;
        if (meetingData.duration_mins) {
          // Ensure duration_mins is a number and handle potential string conversion
          const duration = Number(meetingData.duration_mins);
          if (!isNaN(duration)) {
            meeting.duration_mins = duration;
            this.logger.log(
              `⏱️ Set meeting duration to: ${duration} (type: ${typeof duration})`,
              "MeetingsService",
            );
          } else {
            this.logger.error(
              `❌ Invalid duration_mins value: ${meetingData.duration_mins}`,
              undefined,
              "MeetingsService",
            );
            throw new Error(
              `Invalid duration_mins value: ${meetingData.duration_mins}`,
            );
          }
        }
        if (meetingData.host_email) meeting.host_email = meetingData.host_email;
        if (meetingData.meeting_url)
          meeting.meeting_url = meetingData.meeting_url;
        if (meetingData.participants_email)
          meeting.participants_email = meetingData.participants_email;
        if (meetingData.meeting_date)
          meeting.meeting_date = new Date(meetingData.meeting_date);
        if (meetingData.bot_id) meeting.bot_id = meetingData.bot_id;
        if (meetingData.calendar_id)
          meeting.calendar_id = meetingData.calendar_id;
        if (meetingData.team_id) meeting.team_id = meetingData.team_id;
        if (meetingData.meeting_type_id)
          meeting.meetingType = {
            id: meetingData.meeting_type_id,
          } as MeetingType;

        // Mark as analysed
        meeting.analysed = true;
      }

      const savedMeeting = await this.meetingsRepository.save(meeting);

      // Send webhook notification for meeting completion
      await this.webhookNotificationService.sendMeetingCompletedWebhook(
        organizationId,
        savedMeeting,
        action,
      );

      // Handle video download and storage if video_url is provided
      if (meetingData?.video_url) {
        // Store the working video URL immediately (works for 30 mins)
        meeting.video_url = meetingData.video_url;
        meeting.video_processing_status = "processing";
        
        // Queue video processing as background job (non-blocking)
        // This will download and store the video for permanent access
        this.processVideoAsync(meetingData.video_url, savedMeeting.id, organizationId)
          .catch(error => {
            this.logger.error("❌ Background video processing failed:", error);
          });
      }

      // Track meeting event
      await this.usageEventsService.logEvent(
        organizationId,
        action === "created"
          ? EventType.MEETING_CREATED
          : EventType.MEETING_COMPLETED,
        userId,
        {
          meetingId: savedMeeting.id,
        },
        1,
      );

      // Track call minutes usage for freemium model
      if (meetingData?.duration_mins && meetingData.duration_mins > 0) {
        // For existing meetings, only track if duration wasn't previously set
        if (
          action === "created" ||
          !meeting.duration_mins ||
          meeting.duration_mins === 0
        ) {
          await this.usageEventsService.trackCallMinutesUsed(
            organizationId,
            userId,
            meetingData.duration_mins,
          );
          this.logger.log(
            `📊 Tracked ${meetingData.duration_mins} call minutes for meeting ${savedMeeting.id}`,
            "MeetingsService",
          );
        } else {
          this.logger.log(
            `📊 Meeting ${savedMeeting.id} already had duration tracked,  skipping duplicate tracking`,
            "MeetingsService",
          );
        }
      }

      // Send meeting analysis email to all participants if meeting was completed (async)
      if (
        action === "updated" ||
        (action === "created" && savedMeeting.analysed)
      ) {
        // Process email sending asynchronously (non-blocking)
        this.sendMeetingAnalysisEmailAsync(savedMeeting, organizationId)
          .catch(error => {
            this.logger.error("❌ Background email processing failed:", error);
          });
      }

      return {
        meeting_id: savedMeeting.id,
        action,
        meeting: savedMeeting,
      };
    } catch (error) {
      this.logger.error("Error submitting complete meeting data:", error);
      throw error;
    }
  }

  /**
   * Send meeting analysis email asynchronously in the background
   */
  private async sendMeetingAnalysisEmailAsync(
    meeting: Meetings,
    organizationId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `📧 Starting background email processing for meeting ${meeting.id}`,
        "MeetingsService",
      );

      // Get organization details for the email
      const organization = await this.supabaseService.client
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .single();

      const organizationName =
        organization?.data?.name || "Your Organization";

      // Create or get share link for the meeting
      let shareUrl: string | undefined;
      try {
        let shareLink = await this.meetingSharesService.getShareLink(
          meeting.id,
        );

        // If no share link exists, create one
        if (!shareLink) {
          shareLink = await this.meetingSharesService.createShareLink(
            { meeting_id: meeting.id },
            meeting.user_id || "system",
          );
        }

        if (shareLink) {
          const frontendUrl =
            this.configService.get<string>("FRONTEND_URL") ||
            "http://localhost:3000";
          shareUrl = `${frontendUrl}/shared/${meeting.id}?token=${shareLink.share_token}`;
        }
      } catch (error) {
        this.logger.error(
          "Failed to get or create share link for meeting:",
          error,
        );
      }

      // Get the meeting owner's email
      let ownerEmail: string | undefined;
      try {
        if (meeting.user_id) {
          const ownerProfile = await this.profilesService.getProfile(
            meeting.user_id,
          );
          ownerEmail = ownerProfile.email || undefined;
        }
      } catch (error) {
        this.logger.error("Failed to get meeting owner's email:", error);
      }

      await this.emailService.sendMeetingAnalysisEmail(
        {
          title: meeting.title || "Untitled Meeting",
          summary: meeting.email_summary || meeting.summary || "",
          duration_mins: meeting.duration_mins || 0,
          meeting_date: meeting.meeting_date || new Date(),
          host_email: meeting.host_email || "",
          participants_email: meeting.participants_email || [],
          owner_email: ownerEmail,
          video_url: meeting.video_url,
          transcript_url: meeting.transcript_url,
          chapters: meeting.chapters,
          shareUrl: shareUrl,
          meetingId: meeting.id,
        },
        organizationName,
      );

      this.logger.log(
        `✅ Background email processing completed for meeting ${meeting.id}`,
        "MeetingsService",
      );
    } catch (error) {
      this.logger.error(
        `❌ Background email processing failed for meeting ${meeting.id}:`,
        error,
      );
    }
  }

  /**
   * Process video asynchronously in the background
   */
  private async processVideoAsync(
    originalVideoUrl: string,
    meetingId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `🔄 Starting background video processing for meeting ${meetingId}`,
        "MeetingsService",
      );
      this.logger.log(
        `⏰ Original video URL expires in ~30 minutes, processing for permanent storage...`,
        "MeetingsService",
      );
      
      const storedVideoUrl = await this.downloadAndStoreVideo(
        originalVideoUrl,
        meetingId,
        organizationId,
      );
      
      // Update the meeting with the permanent stored video URL
      await this.meetingsRepository.update(meetingId, {
        video_url: storedVideoUrl,
        video_processing_status: "completed",
      });
      
      this.logger.log(
        `✅ Background video processing completed for meeting ${meetingId}`,
        "MeetingsService",
      );
      this.logger.log(
        `🔗 Video now permanently stored at: ${storedVideoUrl}`,
        "MeetingsService",
      );
    } catch (error) {
      this.logger.error(
        `❌ Background video processing failed for meeting ${meetingId}:`,
        error,
      );
      this.logger.warn(
        `⚠️ Meeting ${meetingId} will keep original video URL (expires in ~30 mins)`,
        "MeetingsService",
      );
      // Update meeting with error status but keep original URL
      await this.meetingsRepository.update(meetingId, {
        video_processing_status: "failed",
        // Don't update video_url - keep the working original URL
      });
    }
  }

  /**
   * Download video from external URL and store in Supabase storage
   */
  private async downloadAndStoreVideo(
    videoUrl: string,
    meetingId: string,
    organizationId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `🔧 Ensuring meeting-videos bucket exists...`,
        "MeetingsService",
      );
      // Ensure the meeting-videos bucket exists
      await this.ensureMeetingVideosBucket();

      this.logger.log(
        `⬇️  Starting video download from: ${videoUrl}`,
        "MeetingsService",
      );
      // Download the video using robust HTTP client
      const videoBuffer = await this.downloadVideoRobust(videoUrl);
      this.logger.log(
        `✅ Video downloaded successfully, size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`,
        "MeetingsService",
      );

      // Generate filename
      const urlParts = videoUrl.split("/");
      const originalFilename = urlParts[urlParts.length - 1].split("?")[0]; // Remove query params
      const fileExtension = originalFilename.includes(".")
        ? originalFilename.split(".").pop()
        : "mp4";
      const filename = `meetings/${organizationId}/${meetingId}/video.${fileExtension}`;
      this.logger.log(`📁 Generated filename: ${filename}`, "MeetingsService");

      this.logger.log(
        `☁️  Uploading video to Supabase storage...`,
        "MeetingsService",
      );
      // Upload to Supabase storage
      const { data, error } = await this.supabaseService.client.storage
        .from("meeting-videos")
        .upload(filename, videoBuffer, {
          contentType: `video/${fileExtension}`,
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload video to Supabase: ${error.message}`);
      }
      this.logger.log(
        `✅ Video uploaded to Supabase successfully`,
        "MeetingsService",
      );

      // For private buckets, we store the file path and create signed URLs when needed
      // The video_url field will contain the storage path, not a public URL
      const storagePath = `meeting-videos/${filename}`;
      this.logger.log(
        `🎯 Video stored at path: ${storagePath}`,
        "MeetingsService",
      );
      return storagePath;
    } catch (error) {
      this.logger.error("❌ Error in downloadAndStoreVideo:", error);
      throw error;
    }
  }

  /**
   * Check if the meeting-videos bucket exists in Supabase storage
   */
  private async ensureMeetingVideosBucket(): Promise<void> {
    try {
      this.logger.log(
        `🔍 Checking if meeting-videos bucket exists...`,
        "MeetingsService",
      );
      this.logger.log(
        `🔑 Service key starts with: ${this.configService.get<string>("SUPABASE_SERVICE_KEY")?.substring(0, 20)}...`,
        "MeetingsService",
      );

      // Check if bucket exists
      const { data: buckets, error: listError } =
        await this.supabaseService.client.storage.listBuckets();

      if (listError) {
        this.logger.error(
          "❌ Error listing storage buckets:",
          undefined,
          "MeetingsService",
          listError,
        );
        this.logger.error("❌ Error details:", undefined, "MeetingsService", {
          message: listError.message,
          name: listError.name,
        });
        throw new Error("Cannot access Supabase storage buckets");
      }

      this.logger.log(
        `📋 Found ${buckets?.length || 0} existing buckets`,
        "MeetingsService",
      );

      // Log all bucket details if we can access them
      if (buckets && buckets.length > 0) {
        this.logger.log("📦 Existing buckets:", "MeetingsService");
        buckets.forEach((bucket, index) => {
          this.logger.log(
            `   ${index + 1}. ${bucket.name} (${bucket.public ? "PUBLIC" : "PRIVATE"})`,
          );
        });
      } else {
        this.logger.log("📦 No buckets found in storage");
      }

      const bucketExists = buckets?.some(
        (bucket) => bucket.name === "meeting-videos",
      );

      if (!bucketExists) {
        this.logger.error("❌ meeting-videos bucket does not exist");
        this.logger.log(
          "📝 Please create the bucket manually in your Supabase dashboard:",
        );
        this.logger.log("   1. Go to Storage in your Supabase dashboard");
        this.logger.log('   2. Click "Create a new bucket"');
        this.logger.log('   3. Name it "meeting-videos"');
        this.logger.log("   4. Set it as PRIVATE (not public)");
        this.logger.log("   5. Set file size limit to 2GB");
        this.logger.log(
          "   6. Configure RLS policies for authenticated access only",
        );
        throw new Error(
          "meeting-videos bucket not found. Please create it manually in Supabase dashboard.",
        );
      } else {
        this.logger.log(
          `✅ meeting-videos bucket exists and is ready`,
          "MeetingsService",
        );
      }
    } catch (error) {
      this.logger.error("❌ Error checking meeting-videos bucket:", error);
      throw error;
    }
  }

  /**
   * Download video from external URL with robust error handling and retries
   * Optimized for DigitalOcean network issues
   */
  private async downloadVideoRobust(url: string): Promise<Buffer> {
    const maxRetries = 3;
    const baseRetryDelay = 2000; // 2 seconds base delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `🔄 Download attempt ${attempt}/${maxRetries} for: ${url}`,
          "MeetingsService",
        );
        return await this.downloadVideo(url);
      } catch (error: any) {
        this.logger.error(
          `❌ Download attempt ${attempt} failed:`,
          error.message,
        );

        // Check if this is a network-related error that might benefit from retry
        const isNetworkError =
          error.code &&
          ["ETIMEDOUT", "EHOSTUNREACH", "ENOTFOUND", "ECONNRESET"].includes(
            error.code,
          );

        if (attempt === maxRetries) {
          const errorType = isNetworkError ? "network" : "application";
          throw new Error(
            `Failed to download video after ${maxRetries} attempts (${errorType} error): ${error.message}`,
          );
        }

        // Exponential backoff with jitter for network errors
        const delay = isNetworkError
          ? baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
          : baseRetryDelay * attempt;

        this.logger.log(
          `⏳ Waiting ${Math.round(delay)}ms before retry... (${isNetworkError ? "network error" : "application error"})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Unexpected error in downloadVideoRobust");
  }

  /**
   * Create a signed URL for accessing a stored video (for authenticated users)
   */
  async createSignedVideoUrl(
    storagePath: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Extract the filename from the storage path
      const filename = storagePath.replace("meeting-videos/", "");

      const { data, error } = await this.supabaseService.client.storage
        .from("meeting-videos")
        .createSignedUrl(filename, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error("Error creating signed video URL:", error);
      throw error;
    }
  }

  /**
   * Download video from external URL
   */
  private async downloadVideo(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.logger.log(`🌐 Starting HTTP request to: ${url}`, "MeetingsService");
      const protocol = url.startsWith("https:") ? https : http;

      // Prepare request options with headers and network optimizations for DigitalOcean
      const requestOptions = {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Knowted/1.0)",
          Accept: "video/*,application/octet-stream,*/*",
        },
        // Force IPv4 connections to avoid IPv6 issues on DigitalOcean
        family: 4,
        // Increase connection timeout for better reliability
        timeout: 60000, // 60 seconds connection timeout
        // Add keep-alive for better connection reuse
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 1, // Limit concurrent connections to avoid overwhelming the network
        maxFreeSockets: 1,
      };

      this.logger.log(
        `🚀 Request will be sent with headers:`,
        "MeetingsService",
        { headers: requestOptions.headers },
      );
      this.logger.log(
        `🌐 Network config: IPv4 only, timeout: ${requestOptions.timeout}ms`,
      );

      const request = protocol.get(url, requestOptions, (response) => {
        this.logger.log(
          `📡 HTTP Response Status: ${response.statusCode} ${response.statusMessage}`,
        );
        this.logger.log(`📊 Response Headers:`, "MeetingsService", {
          headers: response.headers,
        });

        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const newUrl = response.headers.location;
          if (newUrl) {
            this.logger.log(
              `🔄 Following redirect to: ${newUrl}`,
              "MeetingsService",
            );
            this.downloadVideo(newUrl).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download video: ${response.statusCode} - ${response.statusMessage}`,
            ),
          );
          return;
        }

        // Check content type to ensure it's a video
        const contentType = response.headers["content-type"];
        this.logger.log(`🎬 Content-Type: ${contentType}`, "MeetingsService");
        if (
          contentType &&
          !contentType.startsWith("video/") &&
          !contentType.includes("octet-stream")
        ) {
          this.logger.warn(
            `⚠️  Warning: Content-Type is ${contentType}, expected video/*`,
            "MeetingsService",
          );
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on("data", (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;

          // Log progress every 1MB
          if (totalSize % (1024 * 1024) === 0) {
            this.logger.log(
              `📥 Downloaded: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            );
          }

          // Check file size limit (e.g., 2GB)
          if (totalSize > 2000 * 1024 * 1024) {
            request.destroy();
            reject(new Error("Video file too large (max 2GB)"));
          }
        });

        response.on("end", () => {
          if (totalSize === 0) {
            reject(new Error("Empty video file received"));
            return;
          }
          this.logger.log(
            `✅ Download completed! Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
          );
          resolve(Buffer.concat(chunks));
        });

        response.on("error", reject);
      });

      request.on("error", (error: any) => {
        this.logger.error(`❌ Request error:`, error);
        // Add more detailed error logging for DigitalOcean debugging
        if (error.code === "ETIMEDOUT") {
          this.logger.error(
            `⏰ Connection timeout - this often indicates network/firewall issues on DigitalOcean`,
          );
        } else if (error.code === "EHOSTUNREACH") {
          this.logger.error(
            `🚫 Host unreachable - check if IPv6 is disabled and firewall allows outbound HTTPS`,
          );
        } else if (error.code === "ENOTFOUND") {
          this.logger.error(
            `🔍 DNS resolution failed - check DNS configuration on DigitalOcean droplet`,
          );
        }
        reject(error);
      });

      // Set a longer timeout for the entire request (5 minutes)
      request.setTimeout(300000);

      // Add connection timeout handling
      request.on("socket", (socket) => {
        socket.setTimeout(requestOptions.timeout);
        socket.on("timeout", () => {
          this.logger.error(
            `⏰ Socket timeout after ${requestOptions.timeout}ms`,
            undefined,
            "MeetingsService",
          );
          request.destroy();
          reject(
            new Error(`Connection timeout after ${requestOptions.timeout}ms`),
          );
        });
      });
    });
  }

  private calculateTimeUntilMeeting(meetingDate: Date): string {
    const now = new Date();
    const diffMs = meetingDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Meeting is starting now or has already started";
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day(s), ${diffHours} hour(s), ${diffMinutes} minute(s)`;
    } else if (diffHours > 0) {
      return `${diffHours} hour(s), ${diffMinutes} minute(s)`;
    } else {
      return `${diffMinutes} minute(s)`;
    }
  }

  private detectCalendarProvider(meetingUrl?: string): string {
    if (!meetingUrl) return "unknown";

    const url = meetingUrl.toLowerCase();
    if (url.includes("zoom.us")) return "zoom";
    if (url.includes("teams.microsoft.com") || url.includes("teams.live.com"))
      return "teams";
    if (url.includes("meet.google.com")) return "google_meet";
    if (url.includes("webex.com")) return "webex";
    if (url.includes("gotomeeting.com")) return "gotomeeting";
    if (url.includes("bluejeans.com")) return "bluejeans";
    if (url.includes("skype.com")) return "skype";
    if (url.includes("discord.com") || url.includes("discord.gg"))
      return "discord";
    if (url.includes("slack.com")) return "slack";
    if (url.includes("hangouts.google.com")) return "google_hangouts";
    if (url.includes("calendar.google.com")) return "google_calendar";
    if (url.includes("outlook.office.com") || url.includes("outlook.live.com"))
      return "outlook";

    return "other";
  }

  /**
   * Get a signed URL for a meeting's video (for authenticated users)
   */
  async getMeetingVideoUrl(
    meetingId: string,
    organizationId: string,
    expiresIn: number = 3600,
  ): Promise<string | null> {
    try {
      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ["id", "video_url", "organization_id"],
      });

      if (!meeting || !meeting.video_url) {
        return null;
      }

      // Check if it's a stored video (starts with 'meeting-videos/')
      if (meeting.video_url.startsWith("meeting-videos/")) {
        return await this.createSignedVideoUrl(meeting.video_url, expiresIn);
      }

      // If it's an external URL, return as-is
      return meeting.video_url;
    } catch (error) {
      this.logger.error("Error getting meeting video URL:", error);
      return null;
    }
  }

  async findOneShared(meetingId: string): Promise<Meetings | null> {
    // This method is for public access to shared meetings
    // It returns a simplified version without sensitive information
    this.logger.log(
      `🔍 findOneShared called for meeting ID: ${meetingId}`,
      "MeetingsService",
    );

    const meeting = await this.meetingsRepository.findOne({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        meeting_date: true,
        duration_mins: true,
        summary: true,
        transcript: true,
        chapters: true,
        host_email: true,
        participants_email: true,
        meeting_url: true,
        video_url: true,
        transcript_url: true,
        thumbnail: true,
        meta_data: true,
        summary_meta_data: true,
        transcript_json: true,
        created_at: true,
        updated_at: true,
        organization: {
          id: true,
        },
      },
      relations: ["organization"],
    });

    this.logger.log(`🔍 findOneShared result:`, "MeetingsService", {
      meetingId,
      hasMeeting: !!meeting,
      meetingDetails: meeting
        ? {
            id: meeting.id,
            title: meeting.title,
            hasVideoUrl: !!meeting.video_url,
            videoUrl: meeting.video_url
              ? meeting.video_url.substring(0, 50) + "..."
              : null,
            hasOrganization: !!meeting.organization,
            organizationId: meeting.organization?.id,
          }
        : null,
    });

    return meeting;
  }

  /**
   * Stream meeting video with security and format support
   */
  async streamMeetingVideo(
    meetingId: string,
    organizationId: string,
    userId: string,
    format: string = "progressive",
    quality: string = "720p",
    rangeHeader?: string,
  ): Promise<{
    stream?: any;
    url?: string;
    contentLength?: number;
    range?: { start: number; end: number };
  } | null> {
    try {
      // Verify meeting access
      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ["id", "video_url", "video_processing_status", "organization_id", "user_id"], 
        relations: ["organization"],
      });

      if (!meeting || !meeting.video_url) {
        return null;
      }

      // Check if user has access to this meeting
      const hasAccess = await this.checkUserMeetingAccess(
        userId,
        meetingId,
        organizationId,
      );
      if (!hasAccess) {
        throw new UnauthorizedException(
          "User does not have access to this meeting",
        );
      }

      // Smart video handling based on processing status
      if (meeting.video_processing_status === "completed" && meeting.video_url.startsWith("meeting-videos/")) {
        // ✅ Permanently stored video - use optimized streaming
        return await this.streamStoredVideo(
          meeting.video_url,
          format,
          quality,
          rangeHeader,
        );
      } else if (meeting.video_processing_status === "processing" || meeting.video_processing_status === "failed") {
        // ⚠️ Video still processing or failed - use original working URL
        if (meeting.video_url.startsWith("http")) {
          // External video - return URL directly
          return { url: meeting.video_url };
        } else {
          // Fallback to stored video approach
          return await this.streamStoredVideo(
            meeting.video_url,
            format,
            quality,
            rangeHeader,
          );
        }
      } else if (meeting.video_url.startsWith("meeting-videos/")) {
        // Legacy stored video (no processing status)
        return await this.streamStoredVideo(
          meeting.video_url,
          format,
          quality,
          rangeHeader,
        );
      } else if (meeting.video_url.startsWith("http")) {
        // External video - return signed URL or redirect
        if (format === "progressive") {
          // For progressive streaming, we can redirect to the external URL
          return { url: meeting.video_url };
        } else {
          // For HLS/DASH, we need to check if the external URL supports it
          return { url: meeting.video_url };
        }
      }

      return null;
    } catch (error) {
      this.logger.error("Error streaming meeting video:", error);
      throw error;
    }
  }

  /**
   * Stream meeting video with token-based authentication
   */
  async streamMeetingVideoWithToken(
    meetingId: string,
    token: string,
    format: string = "progressive",
    quality: string = "720p",
    rangeHeader?: string,
  ): Promise<{
    stream?: any;
    url?: string;
    contentLength?: number;
    range?: { start: number; end: number };
  } | null> {
    try {
      this.logger.log(
        `🔍 streamMeetingVideoWithToken called with:`,
        "MeetingsService",
        {
          meetingId,
          token: token.substring(0, 20) + "...",
          format,
          quality,
        },
      );

      // Check if this is a shared meeting token or regular streaming token
      const decodedToken = this.decodeStreamingToken(token);
      this.logger.log(`🔍 Decoded token:`, "MeetingsService", {
        hasDecodedToken: !!decodedToken,
        decodedToken: decodedToken
          ? {
              meetingId: decodedToken.meetingId,
              organizationId: decodedToken.organizationId,
              hasShareToken: !!decodedToken.shareToken,
              shareToken: decodedToken.shareToken
                ? decodedToken.shareToken.substring(0, 20) + "..."
                : null,
              expiresAt: decodedToken.expiresAt,
              currentTime: Date.now(),
              isExpired: decodedToken.expiresAt < Date.now(),
            }
          : null,
      });

      if (!decodedToken) {
        this.logger.error("❌ Failed to decode streaming token");
        throw new UnauthorizedException("Invalid streaming token");
      }

      // Check if token is expired
      if (decodedToken.expiresAt < Date.now()) {
        this.logger.error(
          "❌ Streaming token has expired:",
          undefined,
          "MeetingsService",
          {
            expiresAt: decodedToken.expiresAt,
            currentTime: Date.now(),
            difference: decodedToken.expiresAt - Date.now(),
          },
        );
        throw new UnauthorizedException("Streaming token has expired");
      }

      // If it's a shared meeting token (contains 'shared' and shareToken)
      if (decodedToken.organizationId === "shared" && decodedToken.shareToken) {
        this.logger.log(
          `🔍 Detected shared meeting token, using shared meeting streaming:`,
          "MeetingsService",
          {
            meetingId,
            shareToken: decodedToken.shareToken.substring(0, 20) + "...",
            decodedMeetingId: decodedToken.meetingId,
            urlMeetingId: meetingId,
            meetingIdsMatch: decodedToken.meetingId === meetingId,
          },
        );

        // Check if meeting IDs match
        if (decodedToken.meetingId !== meetingId) {
          this.logger.error(
            "❌ Meeting ID mismatch:",
            undefined,
            "MeetingsService",
            {
              decodedMeetingId: decodedToken.meetingId,
              urlMeetingId: meetingId,
            },
          );
          throw new UnauthorizedException("Meeting ID mismatch in token");
        }

        return await this.streamSharedMeetingVideo(
          meetingId,
          decodedToken.shareToken,
          format,
          quality,
          rangeHeader,
        );
      }

      // Otherwise, treat it as a regular streaming token
      const meetingInfo = await this.verifyStreamingToken(meetingId, token);
      if (!meetingInfo) {
        throw new UnauthorizedException("Invalid streaming token");
      }

      const { meeting, organizationId } = meetingInfo;

      if (!meeting || !meeting.video_url) {
        return null;
      }

      // Handle different video sources
      if (meeting.video_url.startsWith("meeting-videos/")) {
        // Stored video - implement streaming logic
        return await this.streamStoredVideo(
          meeting.video_url,
          format,
          quality,
          rangeHeader,
        );
      } else if (meeting.video_url.startsWith("http")) {
        // External video - return signed URL or redirect
        if (format === "progressive") {
          // For progressive streaming, we can redirect to the external URL
          return { url: meeting.video_url };
        } else {
          // For HLS/DASH, we need to check if the external URL supports it
          return { url: meeting.video_url };
        }
      }

      return null;
    } catch (error) {
      this.logger.error("Error streaming meeting video with token:", error);
      throw error;
    }
  }

  /**
   * Verify streaming token and return meeting info
   */
  private async verifyStreamingToken(
    meetingId: string,
    token: string,
  ): Promise<{
    meeting: any;
    organizationId: string;
  } | null> {
    try {
      // For now, implement a simple token verification
      // In production, you should use JWT or a similar secure token system

      // Decode the token (this is a simplified example)
      // In reality, you'd want to use a proper JWT library
      const decodedToken = this.decodeStreamingToken(token);
      if (!decodedToken) {
        return null;
      }

      const {
        meetingId: tokenMeetingId,
        organizationId,
        expiresAt,
      } = decodedToken;

      // Check if token is for the correct meeting
      if (tokenMeetingId !== meetingId) {
        return null;
      }

      // Check if token is expired
      if (expiresAt < Date.now()) {
        return null;
      }

      // Get meeting info
      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ["id", "video_url", "video_processing_status", "organization_id"],
        relations: ["organization"],
      });

      if (!meeting) {
        return null;
      }

      return { meeting, organizationId };
    } catch (error) {
      this.logger.error("Error verifying streaming token:", error);
      return null;
    }
  }

  /**
   * Decode streaming token (simplified implementation)
   * In production, use a proper JWT library
   */
  private decodeStreamingToken(token: string): {
    meetingId: string;
    organizationId: string;
    expiresAt: number;
    shareToken?: string;
  } | null {
    try {
      // This is a simplified token format for demonstration
      // In production, use JWT with proper signing
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split("|");

      if (parts.length === 3) {
        // Regular streaming token: meetingId|organizationId|expiresAt
        return {
          meetingId: parts[0],
          organizationId: parts[1],
          expiresAt: parseInt(parts[2], 10),
        };
      } else if (parts.length === 4) {
        // Shared meeting token: meetingId|shared|shareToken|expiresAt
        if (parts[1] === "shared") {
          return {
            meetingId: parts[0],
            organizationId: parts[1],
            shareToken: parts[2],
            expiresAt: parseInt(parts[3], 10),
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error("Error decoding streaming token:", error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific meeting
   */
  private async checkUserMeetingAccess(
    userId: string,
    meetingId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      // For now, we'll rely on the existing guards and just verify the meeting exists
      // The PermissionGuard and OrganizationMembershipGuard already handle access control
      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ["id"],
      });

      return !!meeting;
    } catch (error) {
      this.logger.error("Error checking user meeting access:", error);
      return false;
    }
  }

  /**
   * Stream stored video with different formats
   */
  private async streamStoredVideo(
    videoPath: string,
    format: string,
    quality: string,
    rangeHeader?: string,
  ): Promise<{
    stream?: any;
    url?: string;
    contentLength?: number;
    range?: { start: number; end: number };
  }> {
    try {
      this.logger.log(
        `🎬 Streaming stored video: ${videoPath}, format: ${format}, quality: ${quality}`,
      );

      if (format === "hls" || format === "dash") {
        // HLS and DASH not yet implemented, fall back to progressive streaming
        this.logger.log(
          `⚠️  ${format.toUpperCase()} not yet implemented, falling back to progressive streaming`,
        );
        format = "progressive";
      }

      // Progressive streaming
      try {
        this.logger.log(
          `✅ Using signed URL approach for progressive streaming`,
          "MeetingsService",
        );
        const signedUrl = await this.createSignedVideoUrl(videoPath, 3600);
        this.logger.log(
          `✅ Generated signed URL: ${signedUrl.substring(0, 100)}...`,
        );

        return { url: signedUrl };
      } catch (signedUrlError) {
        this.logger.error("❌ Error creating signed URL:", signedUrlError);
        throw new Error(
          `Failed to create signed URL: ${signedUrlError.message}`,
        );
      }
    } catch (error) {
      this.logger.error("Error streaming stored video:", error);
      throw error;
    }
  }

  /**
   * Get secure streaming URL for meeting video
   */
  async getMeetingStreamingUrl(
    meetingId: string,
    organizationId: string,
    userId: string,
    format: string = "progressive",
    quality: string = "720p",
  ): Promise<string | null> {
    try {
      this.logger.log(
        `🔍 getMeetingStreamingUrl called with:`,
        "MeetingsService",
        {
          meetingId,
          organizationId,
          userId,
          format,
          quality,
        },
      );

      // Verify meeting access
      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId, organization: { id: organizationId } },
        select: ["id", "video_url", "video_processing_status", "organization_id"],
        relations: ["organization"],
      });

      this.logger.log(`🔍 Meeting found:`, "MeetingsService", {
        meetingId,
        hasMeeting: !!meeting,
        videoUrl: meeting?.video_url,
        organizationId: meeting?.organization_id,
      });

      if (!meeting || !meeting.video_url) {
        this.logger.log(
          `❌ No meeting or video URL found:`,
          "MeetingsService",
          {
            meetingId,
            hasMeeting: !!meeting,
            videoUrl: meeting?.video_url,
          },
        );
        return null;
      }

      // Check if user has access to this meeting
      const hasAccess = await this.checkUserMeetingAccess(
        userId,
        meetingId,
        organizationId,
      );
      this.logger.log(`🔍 User access check:`, "MeetingsService", {
        userId,
        meetingId,
        organizationId,
        hasAccess,
      });

      if (!hasAccess) {
        throw new UnauthorizedException(
          "User does not have access to this meeting",
        );
      }

      // Smart video handling based on processing status
      if (meeting.video_processing_status === "completed" && meeting.video_url.startsWith("meeting-videos/")) {
        // ✅ Permanently stored video - generate streaming URL with token
        const streamingToken = await this.generateStreamingToken(
          meetingId,
          organizationId,
          userId,
          3600,
        );
        const baseUrl =
          this.configService.get<string>("API_URL") || "http://localhost:3000";
        return `${baseUrl}/api/v1/public/meetings/${meetingId}/video-stream?token=${streamingToken}&format=${format}&quality=${quality}`;
      } else if (meeting.video_processing_status === "processing" || meeting.video_processing_status === "failed") {
        // ⚠️ Video still processing or failed - use original working URL
        if (meeting.video_url.startsWith("http")) {
          // External video - return URL directly
          return meeting.video_url;
        } else {
          // Fallback to stored video approach with token
          const streamingToken = await this.generateStreamingToken(
            meetingId,
            organizationId,
            userId,
            3600,
          );
          const baseUrl =
            this.configService.get<string>("API_URL") || "http://localhost:3000";
          return `${baseUrl}/api/v1/public/meetings/${meetingId}/video-stream?token=${streamingToken}&format=${format}&quality=${quality}`;
        }
      } else if (meeting.video_url.startsWith("meeting-videos/")) {
        // Legacy stored video (no processing status)
        const streamingToken = await this.generateStreamingToken(
          meetingId,
          organizationId,
          userId,
          3600,
        );
        const baseUrl =
          this.configService.get<string>("API_URL") || "http://localhost:3000";
        return `${baseUrl}/api/v1/public/meetings/${meetingId}/video-stream?token=${streamingToken}&format=${format}&quality=${quality}`;
      } else if (meeting.video_url.startsWith("http")) {
        // External video - check if it supports the requested format
        if (format === "progressive") {
          return meeting.video_url;
        } else {
          // For HLS/DASH, we need to check if the external URL supports it
          // For now, return the original URL
          return meeting.video_url;
        }
      }

      this.logger.log(`❌ Video URL format not recognized:`, meeting.video_url);
      return null;
    } catch (error) {
      this.logger.error("Error getting meeting streaming URL:", error);
      throw error;
    }
  }

  /**
   * Generate a streaming token for secure video access
   */
  async generateStreamingToken(
    meetingId: string,
    organizationId: string,
    userId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Verify user has access to this meeting
      const hasAccess = await this.checkUserMeetingAccess(
        userId,
        meetingId,
        organizationId,
      );
      if (!hasAccess) {
        throw new UnauthorizedException(
          "User does not have access to this meeting",
        );
      }

      // Create a simple token (in production, use JWT)
      const expiresAt = Date.now() + expiresIn * 1000;
      const tokenData = `${meetingId}|${organizationId}|${expiresAt}`;
      const token = Buffer.from(tokenData).toString("base64");

      this.logger.log(
        `🔑 Generated streaming token for meeting ${meetingId}, expires in ${expiresIn}s`,
      );
      return token;
    } catch (error) {
      this.logger.error("Error generating streaming token:", error);
      throw error;
    }
  }

  /**
   * Generate a streaming token for shared meeting video access
   */
  async generateStreamingTokenForSharedMeeting(
    meetingId: string,
    shareToken: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Validate the share token first
      const isValid = await this.meetingSharesService.validateShareToken(
        meetingId,
        shareToken,
      );
      if (!isValid) {
        throw new UnauthorizedException("Invalid share token");
      }

      // Get meeting info to verify it exists
      const meeting = await this.findOneShared(meetingId);
      if (!meeting) {
        throw new NotFoundException("Meeting not found");
      }

      // Create a simple token for shared meetings (in production, use JWT)
      const expiresAt = Date.now() + expiresIn * 1000;
      const tokenData = `${meetingId}|shared|${shareToken}|${expiresAt}`;
      const token = Buffer.from(tokenData).toString("base64");

      this.logger.log(
        `🔑 Generated shared streaming token for meeting ${meetingId}, expires in ${expiresIn}s`,
      );
      return token;
    } catch (error) {
      this.logger.error("Error generating shared streaming token:", error);
      throw error;
    }
  }

  /**
   * Stream shared meeting video with share token authentication
   */
  async streamSharedMeetingVideo(
    meetingId: string,
    shareToken: string,
    format: string = "progressive",
    quality: string = "720p",
    rangeHeader?: string,
  ): Promise<{
    stream?: any;
    url?: string;
    contentLength?: number;
    range?: { start: number; end: number };
  } | null> {
    try {
      this.logger.log(
        `🔍 streamSharedMeetingVideo called with:`,
        "MeetingsService",
        {
          meetingId,
          shareToken: shareToken.substring(0, 20) + "...",
          format,
          quality,
        },
      );

      // Validate the share token first
      this.logger.log(
        `🔍 Validating share token for meeting ${meetingId} with token ${shareToken.substring(0, 20)}...`,
      );
      const isValid = await this.meetingSharesService.validateShareToken(
        meetingId,
        shareToken,
      );
      this.logger.log(`🔍 Share token validation result:`, "MeetingsService", {
        isValid,
        meetingId,
        shareToken: shareToken.substring(0, 20) + "...",
      });

      if (!isValid) {
        this.logger.error(
          "❌ Share token validation failed:",
          undefined,
          "MeetingsService",
          {
            meetingId,
            shareToken: shareToken.substring(0, 20) + "...",
          },
        );
        throw new UnauthorizedException("Invalid share token");
      }

      // Get meeting info
      const meeting = await this.findOneShared(meetingId);
      this.logger.log(`🔍 Found shared meeting:`, "MeetingsService", {
        hasMeeting: !!meeting,
        meetingId,
        hasVideoUrl: !!meeting?.video_url,
        videoUrl: meeting?.video_url
          ? meeting.video_url.substring(0, 50) + "..."
          : null,
      });

      if (!meeting || !meeting.video_url) {
        this.logger.error(
          "❌ Meeting not found or no video available:",
          undefined,
          "MeetingsService",
          {
            meetingId,
            hasMeeting: !!meeting,
            hasVideoUrl: !!meeting?.video_url,
          },
        );
        return null;
      }

      // Handle different video sources
      if (meeting.video_url.startsWith("meeting-videos/")) {
        // Stored video - implement streaming logic
        this.logger.log(
          `✅ Streaming stored video: ${meeting.video_url}`,
          "MeetingsService",
        );
        return await this.streamStoredVideo(
          meeting.video_url,
          format,
          quality,
          rangeHeader,
        );
      } else if (meeting.video_url.startsWith("http")) {
        // External video - return signed URL or redirect
        this.logger.log(
          `✅ Using external video URL: ${meeting.video_url}`,
          "MeetingsService",
        );
        if (format === "progressive") {
          // For progressive streaming, we can redirect to the external URL
          return { url: meeting.video_url };
        } else {
          // For HLS/DASH, we need to check if the external URL supports it
          return { url: meeting.video_url };
        }
      }

      this.logger.error(
        "❌ Video format not supported:",
        undefined,
        "MeetingsService",
        {
          videoUrl: meeting.video_url,
        },
      );
      return null;
    } catch (error) {
      this.logger.error("Error streaming shared meeting video:", error);
      throw error;
    }
  }

  async findAllExternal(
    organizationId: string,
    filters: {
      meeting_id?: string;
      meeting_type_id?: string;
      user_id?: string;
      participant_email?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      page?: number;
      order_by?: string;
      order_direction?: "ASC" | "DESC";
    },
  ): Promise<{
    data: Meetings[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Build query for external API - simpler than internal API (no permission checks)
    const queryBuilder = this.meetingsRepository
      .createQueryBuilder("meeting")
      .leftJoin("meeting.meetingType", "meetingType")
      .where("meeting.organization_id = :organizationId", {
        organizationId,
      })
      .andWhere("meeting.analysed = :analysed", { analysed: true });

    // Apply optional filters
    if (filters.meeting_id) {
      queryBuilder.andWhere("meeting.id = :meetingId", {
        meetingId: filters.meeting_id,
      });
    }

    if (filters.meeting_type_id) {
      queryBuilder.andWhere("meeting.meeting_type_id = :meetingTypeId", {
        meetingTypeId: filters.meeting_type_id,
      });
    }

    if (filters.user_id) {
      queryBuilder.andWhere("meeting.user_id = :userId", {
        userId: filters.user_id,
      });
    }

    if (filters.participant_email) {
      queryBuilder.andWhere(
        ":participantEmail = ANY(meeting.participants_email)",
        {
          participantEmail: filters.participant_email,
        },
      );
    }

    // Apply date range filters
    if (filters.from_date || filters.to_date) {
      if (filters.from_date && filters.to_date) {
        queryBuilder.andWhere(
          "meeting.meeting_date BETWEEN :fromDate AND :toDate",
          {
            fromDate: filters.from_date,
            toDate: filters.to_date,
          },
        );
      } else if (filters.from_date) {
        queryBuilder.andWhere("meeting.meeting_date >= :fromDate", {
          fromDate: filters.from_date,
        });
      } else if (filters.to_date) {
        queryBuilder.andWhere("meeting.meeting_date <= :toDate", {
          toDate: filters.to_date,
        });
      }
    }

    // Apply pagination
    const page = filters.page || 0;
    const limit = Math.min(filters.limit || 5, 100); // Cap at 100

    // Apply ordering
    const orderBy = filters.order_by || "meeting_date";
    const orderDirection = filters.order_direction || "DESC";

    // Map order_by to actual database column names
    const orderByColumn =
      orderBy === "meeting_date"
        ? "meeting.meeting_date"
        : orderBy === "created_at"
        ? "meeting.created_at"
        : orderBy === "duration_mins"
        ? "meeting.duration_mins"
        : "meeting.meeting_date";

    queryBuilder.orderBy(orderByColumn, orderDirection);
    
    // Add secondary sort by created_at for consistency
    if (orderBy !== "created_at") {
      queryBuilder.addOrderBy("meeting.created_at", orderDirection);
    }

    // Get total count and paginated results
    const [meetings, total] = await queryBuilder
      .skip(page * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: meetings,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
