import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { Meetings } from '../meetings/entities/meetings.entity';
import { Webhook } from './entities/webhook.entity';

// Interface for meeting data used in webhook notifications
interface MeetingWebhookData {
  id: string;
  title: string;
  summary: string;
  email_summary?: string;
  duration_mins: number;
  meeting_date?: Date;
  host_email: string;
  participants_email: string[];
  video_url: string;
  transcript_url: string;
  chapters: string;
  thumbnail: string;
  meeting_url: string;
  bot_id: string;
  analysed: boolean;
  meta_data: Record<string, unknown>;
  summary_meta_data: Record<string, unknown>;
  transcript_json: Record<string, unknown>;
  transcript: string;
  video_processing_status: 'none' | 'processing' | 'completed' | 'failed';
  organization_id: string;
  team_id: string;
  calendar_id: string;
  user_id: string;
  created_at?: Date;
  updated_at?: Date;
  organization: { id: string };
}

@Injectable()
export class WebhookNotificationService {
  private readonly logger = new Logger(WebhookNotificationService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async sendMeetingCompletedWebhook(
    organizationId: string,
    meeting: Meetings,
    action: 'created' | 'updated',
  ): Promise<void> {
    try {
      // Find active webhook for the organization
      const webhook = await this.webhookRepository.findOne({
        where: { 
          organization_id: organizationId,
          is_active: true,
        },
      });

      if (!webhook) {
        this.logger.debug(`No active webhook found for organization ${organizationId}`);
        return;
      }

      // Prepare webhook payload
      const payload = this.prepareMeetingWebhookPayload(meeting, action);
      
      // Generate webhook signature
      const signature = this.generateWebhookSignature(payload, webhook.secret);

      // Send webhook
      await this.sendWebhookRequest(webhook.url, payload, signature);

      this.logger.log(`Meeting completed webhook sent successfully for organization ${organizationId}, meeting ${meeting.id}`);
    } catch (error) {
      this.logger.error(`Failed to send meeting completed webhook for organization ${organizationId}: ${error.message}`);
      // Don't throw error to avoid breaking the main meeting completion flow
    }
  }

  private prepareMeetingWebhookPayload(meeting: Meetings, action: 'created' | 'updated'): any {
    return {
      event: 'meeting.completed',
      action: action,
      timestamp: new Date().toISOString(),
      data: {
        meeting: {
          id: meeting.id,
          title: meeting.title,
          summary: meeting.summary,
          email_summary: meeting.email_summary,
          duration_mins: meeting.duration_mins,
          meeting_date: meeting.meeting_date,
          host_email: meeting.host_email,
          participants_email: meeting.participants_email,
          video_url: meeting.video_url,
          transcript_url: meeting.transcript_url,
          chapters: meeting.chapters,
          thumbnail: meeting.thumbnail,
          meeting_url: meeting.meeting_url,
          bot_id: meeting.bot_id,
          analysed: meeting.analysed,
          meta_data: meeting.meta_data,
          summary_meta_data: meeting.summary_meta_data,
          transcript_json: meeting.transcript_json,
          created_at: meeting.created_at,
          updated_at: meeting.updated_at,
        },
        organization: {
          id: meeting.organization?.id,
        },
        user: {
          id: meeting.user_id,
        },
      },
    };
  }

  private generateWebhookSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    return `sha256=${signature}`;
  }

  private async sendWebhookRequest(url: string, payload: any, signature: string): Promise<void> {
    const payloadString = JSON.stringify(payload);

    await axios.post(url, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Knowted-Webhook/1.0',
      },
      timeout: 10000, // 10 second timeout
    });
  }
}
