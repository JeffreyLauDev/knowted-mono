import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { createBaasClient, Event } from "@meeting-baas/sdk";
import { Repository } from "typeorm";

import { TranscriptJsonDto } from "../meetings/dto/transcript-segment.dto";
import { Meetings } from "../meetings/entities/meetings.entity";
import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

@Injectable()
export class MeetingBaasIntegrationService {
  private readonly logger = new Logger(MeetingBaasIntegrationService.name);
  private readonly client: ReturnType<typeof createBaasClient>;

  constructor(
    @InjectRepository(Meetings)
    private meetingsRepository: Repository<Meetings>,
    private usageEventsService: UsageEventsService,
    private configService: ConfigService,
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

  /**
   * Delete bot data using MeetingBaas SDK 5.0.1
   */
  async deleteBotData(botId: number): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      this.logger.log(`Deleting bot data for bot: ${botId}`);

      const result = await this.client.deleteBotData({
        uuid: botId.toString(),
      });

      if (result.success) {
        this.logger.log(`Bot data deleted successfully for bot ${botId}`);
        return {
          success: true,
          message: "Bot data deleted successfully",
          data: result.data,
        };
      } else {
        this.logger.error(`Failed to delete bot data for bot ${botId}:`, {
          error: result.error,
        });

        return {
          success: false,
          message: `Failed to delete bot data: ${result.error.message}`,
          data: result.error,
        };
      }
    } catch (error) {
      this.logger.error(
        `Unexpected error deleting bot data for bot ${botId}:`,
        {
          error: error.message,
          stack: error.stack,
        },
      );

      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
      };
    }
  }

  /**
   * Schedule calendar record event using MeetingBaas SDK 5.0.1
   */
  async scheduleCalendarRecordEvent(
    eventUuid: string,
    botConfig: {
      botName?: string;
      botImage?: string;
      enterMessage?: string;
      recordingMode?: "speaker_view" | "gallery_view" | "audio_only";
      speechToText?: {
        provider: "Default" | "Gladia" | "Runpod";
        apiKey?: string;
      };
      webhookUrl?: string;
      extra?: Record<string, unknown>;
    },
    options: {
      allOccurrences?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      this.logger.log(`Scheduling calendar record event: ${eventUuid}`);

      const requestData = {
        uuid: eventUuid,
        body: {
          bot_name: botConfig.botName,
          bot_image: botConfig.botImage,
          enter_message: botConfig.enterMessage,
          recording_mode: botConfig.recordingMode,
          speech_to_text: botConfig.speechToText,
          extra: botConfig.extra,
        },
        query: {
          all_occurrences: options.allOccurrences,
        },
      };

      this.logger.log(`MeetingBaas API request for event ${eventUuid}:`, {
        requestData: JSON.stringify(requestData, null, 2),
        botConfig: JSON.stringify(botConfig, null, 2),
        options: JSON.stringify(options, null, 2),
      });

      const result = await this.client.scheduleCalendarRecordEvent(requestData);

      this.logger.log(`MeetingBaas API response for event ${eventUuid}:`, {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data?.length || 0,
        hasError: !!result.error,
        errorMessage: result.error?.message || null,
        fullResponse: JSON.stringify(result, null, 2),
      });

      if (result.success) {
        this.logger.log(
          `Calendar record event scheduled successfully: ${result.data.length} events`,
        );
        return {
          success: true,
          message: "Calendar record event scheduled successfully",
          data: result.data,
        };
      } else {
        this.logger.error(
          `Failed to schedule calendar record event ${eventUuid}:`,
          {
            error: result.error,
            fullError: JSON.stringify(result.error, null, 2),
            requestData: JSON.stringify(requestData, null, 2),
          },
        );

        return {
          success: false,
          message: `Failed to schedule calendar record event: ${result.error.message}`,
          data: result.error,
        };
      }
    } catch (error) {
      this.logger.error(
        `Unexpected error scheduling calendar record event ${eventUuid}:`,
        {
          error: error.message,
          stack: error.stack,
        },
      );

      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
      };
    }
  }

  /**
   * List calendar events using MeetingBaas SDK 5.0.1
   */
  async listCalendarEvents(params: {
    calendarId: string;
    startDateGte?: string;
    startDateLte?: string;
    status?: "upcoming" | "past" | "all";
    attendeeEmail?: string;
    organizerEmail?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: Event[];
  }> {
    try {
      this.logger.log(
        `Listing calendar events for calendar: ${params.calendarId}`,
      );

      const result = await this.client.listCalendarEvents({
        calendar_id: params.calendarId,
        start_date_gte: params.startDateGte,
        start_date_lte: params.startDateLte,
        status: params.status,
        // attendee_email: params.attendeeEmail,
        // organizer_email: params.organizerEmail,
      });
      if (result.success) {
        const eventCount = Array.isArray(result.data.data)
          ? result.data.data.length
          : 0;
        this.logger.log(
          `Calendar events listed successfully: ${eventCount} found`,
        );
        return {
          success: true,
          message: "Calendar events listed successfully",
          data: result?.data?.data || [],
        };
      } else {
        this.logger.error(`Failed to list calendar events:`, {
          error: result.error,
        });

        return {
          success: false,
          message: `Failed to list calendar events: ${result.error.message}`,
          data: [],
        };
      }
    } catch (error) {
      this.logger.error(`Unexpected error listing calendar events:`, {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * List raw calendars using MeetingBaas SDK 5.0.1
   */
  async listRawCalendars(params: {
    oauthClientId: string;
    oauthClientSecret: string;
    oauthRefreshToken: string;
    platform: "Google" | "Microsoft";
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      this.logger.log(`Listing raw calendars for platform: ${params.platform}`);

      const result = await this.client.listRawCalendars({
        oauth_client_id: params.oauthClientId,
        oauth_client_secret: params.oauthClientSecret,
        oauth_refresh_token: params.oauthRefreshToken,
        platform: params.platform,
      });

      if (result.success) {
        this.logger.log(
          `Raw calendars listed successfully: ${result.data.calendars.length} found`,
        );
        return {
          success: true,
          message: "Raw calendars listed successfully",
          data: result.data,
        };
      } else {
        this.logger.error(`Failed to list raw calendars:`, {
          error: result.error,
        });

        return {
          success: false,
          message: `Failed to list raw calendars: ${result.error.message}`,
          data: result.error,
        };
      }
    } catch (error) {
      this.logger.error(`Unexpected error listing raw calendars:`, {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
      };
    }
  }

  /**
   * Update meeting with completion data from MeetingBaas webhook
   */
  async updateMeetingWithCompletionData(
    meetingId: string,
    completionData: {
      transcript?: string;
      summary?: string;
      chapters?: string;
      thumbnail?: string;
      video_url?: string;
      transcript_url?: string;
      bot_id: string;
      meta_data?: Record<string, unknown>;
      summary_meta_data?: Record<string, unknown>;
      transcript_json?: TranscriptJsonDto;
    },
    organizationId: string,
    userId: string,
  ): Promise<Meetings> {
    try {
      this.logger.log(`Updating meeting with completion data: ${meetingId}`);

      const meeting = await this.meetingsRepository.findOne({
        where: { id: meetingId },
        relations: ["organization"],
      });

      if (!meeting) {
        throw new Error(`Meeting with ID ${meetingId} not found`);
      }

      // Update meeting with completion data
      const updateData = {
        analysed: true,
        transcript: completionData.transcript || "",
        summary: completionData.summary || "",
        chapters: completionData.chapters || "",
        thumbnail: completionData.thumbnail || "",
        video_url: completionData.video_url || "",
        transcript_url: completionData.transcript_url || "",
        bot_id: completionData.bot_id,
        meta_data: completionData.meta_data || {},
        summary_meta_data: completionData.summary_meta_data || {},
        transcript_json: completionData.transcript_json || {},
      };

      await this.meetingsRepository.update(meetingId, updateData);

      // Track meeting completion
      await this.usageEventsService.logEvent(
        organizationId,
        EventType.MEETING_COMPLETED,
        userId,
        {
          meetingId: meetingId,
          source: "meetingbaas_integration",
          hasTranscript: !!completionData.transcript,
          hasSummary: !!completionData.summary,
          hasVideo: !!completionData.video_url,
        },
        1,
      );

      this.logger.log(`Meeting completion tracked: ${meetingId}`);
      return this.meetingsRepository.findOne({ where: { id: meetingId } });
    } catch (error) {
      this.logger.error(
        `Failed to update meeting ${meetingId} with completion data`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add to live meeting using MeetingBaas SDK 5.0.1
   */
  async addToLiveMeeting(params: {
    meetingName?: string;
    meetingLink: string;
    meetingType: string;
    language: string;
    organizationId: string;
    userId: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    botId?: string;
    meetingId?: string;
  }> {
    try {
      this.logger.log(`Adding to live meeting: ${params.meetingLink}`);

      // First, call MeetingBaas SDK to join the live meeting and get the bot_id
      const botConfig = {
        bot_name: `Knowted.io`,
        bot_image: "https://knowted.io/bot-avatar.png",
        enter_message: `I note it so you can know it`,
        recording_mode: "speaker_view" as const,
        speech_to_text: {
          provider: "Default" as const,
        },
        extra: {
          organization_id: params.organizationId,
          user_id: params.userId,
          language: params.language,
        },
      };

      // Use MeetingBaas SDK to join the live meeting
      const result = await this.client.joinMeeting({
        meeting_url: params.meetingLink,
        bot_name: botConfig.bot_name,
        bot_image: botConfig.bot_image,
        enter_message: botConfig.enter_message,
        recording_mode: botConfig.recording_mode,
        speech_to_text: botConfig.speech_to_text,
        extra: botConfig.extra,
        reserved: false,
      });

      if (result.success) {
        this.logger.log(
          `Successfully added to live meeting: ${result.data.bot_id}`,
        );

        // Now create the meeting record with the bot_id
        const meeting = await this.meetingsRepository.save({
          title: params.meetingName || "Live Meeting",
          user_id: params.userId,
          organization_id: params.organizationId,
          meeting_type_id: params.meetingType,
          meeting_url: params.meetingLink,
          bot_id: result.data.bot_id.toString(),
          // Set default values for required fields
          analysed: false,
          chapters: "",
          duration_mins: 0,
          host_email: "",
          summary: "",
          thumbnail: "",
          video_url: "",
          transcript: "",
          transcript_url: "",
          created_at: new Date(),
          meta_data: {
            language: params.language,
            is_live: true,
          },
        });

        // Track live meeting start
        await this.usageEventsService.logEvent(
          params.organizationId,
          EventType.MEETING_CREATED,
          params.userId,
          {
            meetingId: meeting.id,
            botId: result.data.bot_id,
            meetingLink: params.meetingLink,
            language: params.language,
            isLive: true,
          },
          1,
        );

        return {
          success: true,
          message: "Successfully added to live meeting",
          data: result.data,
          botId: result.data.bot_id.toString(),
          meetingId: meeting.id,
        };
      } else {
        this.logger.error(`Failed to add to live meeting:`, {
          error: result.error,
        });

        return {
          success: false,
          message: `Failed to add to live meeting: ${result.error.message}`,
          data: result.error,
        };
      }
    } catch (error) {
      this.logger.error(`Unexpected error adding to live meeting:`, {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Unexpected error: ${error.message}`,
      };
    }
  }
}
