import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { TranscriptJsonDto } from "../meetings/dto/transcript-segment.dto";
import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

import { MeetingBaasIntegrationService } from "./meetingbaas-integration.service";

// DTO for MeetingBaaS webhook payload
export class MeetingBaasWebhookDto {
  meeting_id: string;
  organization_id: string;
  user_id: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
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
}

@ApiTags("MeetingBaaS Webhook")
@Controller("api/v1/webhooks/meetingbaas")
export class MeetingBaasWebhookController {
  constructor(
    private readonly meetingBaasIntegrationService: MeetingBaasIntegrationService,
    private readonly usageEventsService: UsageEventsService,
    private readonly logger: PinoLoggerService,
  ) {}

  @Post("meeting-completed")
  @ApiOperation({
    summary: "Handle MeetingBaaS meeting completion webhook",
    description:
      "Receives meeting completion data from MeetingBaaS and tracks usage",
  })
  @ApiResponse({
    status: 200,
    description: "Meeting completion processed successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid webhook data" })
  async handleMeetingCompleted(@Body() webhookData: MeetingBaasWebhookDto) {
    try {
      // Track call minutes usage
      if (webhookData.duration_minutes && webhookData.duration_minutes > 0) {
        await this.usageEventsService.trackCallMinutesUsed(
          webhookData.organization_id,
          webhookData.user_id,
          webhookData.duration_minutes,
        );
      }

      // Track meeting completion
      await this.usageEventsService.logEvent(
        webhookData.organization_id,
        EventType.MEETING_COMPLETED,
        webhookData.user_id,
        {
          meetingId: webhookData.meeting_id,
          duration: webhookData.duration_minutes,
          source: "meetingbaas_webhook",
          startTime: webhookData.start_time,
          endTime: webhookData.end_time,
        },
        1,
      );

      // Update meeting record with completion data
      const meeting =
        await this.meetingBaasIntegrationService.updateMeetingWithCompletionData(
          webhookData.meeting_id,
          {
            transcript: webhookData.transcript,
            summary: webhookData.summary,
            chapters: webhookData.chapters,
            thumbnail: webhookData.thumbnail,
            video_url: webhookData.video_url,
            transcript_url: webhookData.transcript_url,
            bot_id: webhookData.bot_id,
            meta_data: webhookData.meta_data,
            summary_meta_data: webhookData.summary_meta_data,
            transcript_json: webhookData.transcript_json,
          },
          webhookData.organization_id,
          webhookData.user_id,
        );

      return {
        success: true,
        message: "Meeting completion processed successfully",
        meeting_id: webhookData.meeting_id,
        duration_tracked: webhookData.duration_minutes,
      };
    } catch (error) {
      this.logger.error(
        "❌ Error processing MeetingBaaS webhook:",
        undefined,
        "MeetingBaasWebhookController",
        error,
      );
      throw error;
    }
  }

  @Post("meeting-started")
  @ApiOperation({
    summary: "Handle MeetingBaaS meeting start webhook",
    description: "Receives meeting start data from MeetingBaaS",
  })
  @ApiResponse({
    status: 200,
    description: "Meeting start processed successfully",
  })
  async handleMeetingStarted(@Body() webhookData: MeetingBaasWebhookDto) {
    try {
      // Track meeting start (optional - for analytics)
      await this.usageEventsService.logEvent(
        webhookData.organization_id,
        EventType.MEETING_CREATED,
        webhookData.user_id,
        {
          meetingId: webhookData.meeting_id,
          source: "meetingbaas_webhook",
          startTime: webhookData.start_time,
        },
        1,
      );

      return {
        success: true,
        message: "Meeting start processed successfully",
        meeting_id: webhookData.meeting_id,
      };
    } catch (error) {
      this.logger.error(
        "❌ Error processing MeetingBaaS start webhook:",
        undefined,
        "MeetingBaasWebhookController",
        error,
      );
      throw error;
    }
  }
}
