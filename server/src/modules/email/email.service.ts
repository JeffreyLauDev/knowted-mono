import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import Mailgun from "mailgun.js";

import { SlackNotificationService } from "../../services/slack-notification.service";
import { EmailTemplates, MeetingData } from "./templates/email-templates";
import { SecurityTemplates } from "./templates/security-templates";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgun: Mailgun;
  private domain: string;

  constructor(
    private configService: ConfigService,
    private slackNotificationService: SlackNotificationService,
  ) {
    this.initializeMailgun();
  }

  private initializeMailgun() {
    const apiKey = this.configService.get<string>("MAILGUN_API_KEY");
    const domain = this.configService.get<string>("MAILGUN_DOMAIN");

    if (!apiKey || !domain) {
      this.logger.warn(
        "Mailgun API key or domain not configured. Email service will be disabled.",
      );
      return;
    }

    try {
      // Use the global FormData constructor - this is the key fix!
      this.mailgun = new Mailgun(globalThis.FormData);
      this.domain = domain;
      this.logger.log("Mailgun initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Mailgun:", error);
    }
  }

  async sendEmail(to: string, subject: string, html: string, from?: string) {
    if (!this.mailgun) {
      this.logger.warn(
        `Email service not available. Skipping email to ${to}: ${subject}`,
      );
      return;
    }

    const mg = this.mailgun.client({
      username: "api",
      key: this.configService.get<string>("MAILGUN_API_KEY"),
    });

    const msg = {
      from: from || "Knowted <noreply@knowted.io>",
      to: [to],
      subject: subject,
      html: html,
    };

    // Simple retry mechanism for Mailgun API calls
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await mg.messages.create(this.domain, msg);
        this.logger.log(`Email sent successfully to ${to}`);
        return;
      } catch (error) {
        if (attempt === 3 || (error.status && error.status < 500)) {
          this.logger.error(`Failed to send email to ${to} after ${attempt} attempts:`, error);
          throw error;
        }
        this.logger.warn(`Email attempt ${attempt} failed, retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async sendOrganizationInvitation(
    to: string,
    firstName: string,
    organizationName: string,
    inviteId: string,
    teamName?: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    const html = EmailTemplates.organizationInvitation(
      firstName,
      organizationName,
      inviteId,
      teamName,
      frontendUrl,
    );

    try {
      await this.sendEmail(
        to,
        `You've been invited to join ${organizationName} on Knowted`,
        html,
      );

      this.logger.log(
        `Organization invitation email sent successfully to ${to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send organization invitation email to ${to}:`,
        error,
      );
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    try {
      await this.sendEmail(
        to,
        "Test Email from Knowted",
        EmailTemplates.testEmail(),
      );

      this.logger.log(`Test email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send test email to ${to}:`, error);
      throw error;
    }
  }

  async sendMeetingAnalysisEmail(
    meetingData: MeetingData,
    organizationName: string,
  ): Promise<void> {
    if (!this.mailgun) {
      this.logger.error("Mailgun not configured - cannot send emails");
      return;
    }

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    const html = EmailTemplates.meetingAnalysis(
      meetingData,
      organizationName,
      frontendUrl,
    );

    // Send email to all participants, host, and meeting owner
    const allParticipants = [
      ...new Set([
        ...meetingData.participants_email,
        meetingData.host_email,
        ...(meetingData.owner_email ? [meetingData.owner_email] : []),
      ]),
    ];

    for (const participantEmail of allParticipants) {
      if (participantEmail && participantEmail.trim()) {
        try {
          this.logger.log(
            `Attempting to send email to: ${participantEmail.trim()}`,
          );
          await this.sendEmail(
            participantEmail.trim(),
            `Meeting Summary:  ${meetingData.title}`,
            html,
          );

          this.logger.log(
            `Meeting analysis email sent successfully to ${participantEmail}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send meeting analysis email to ${participantEmail}:`,
            error,
          );
          // Continue sending to other participants even if one fails
        }
      } else {
        this.logger.warn(`Skipping invalid email: ${participantEmail}`);
      }
    }
  }

  // Automatic Security Incident Detection Methods
  async sendSecurityIncidentAlert(incident: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    details: string;
    affectedUsers?: string[];
    ip?: string;
    userEmail?: string;
  }): Promise<void> {
    try {
      const html = SecurityTemplates.suspiciousActivity({
        type: incident.type,
        details: incident.details,
        time: new Date().toISOString(),
        ip: incident.ip,
        userEmail: incident.userEmail,
      });

      // Always send to admin
      const adminEmail =
        this.configService.get<string>("ADMIN_EMAIL") ||
        "jeffrey.lau@zenovateai.agency";
      await this.sendEmail(
        adminEmail,
        `Knowted Security Alert: ${incident.type} (${incident.severity.toUpperCase()})`,
        html,
      );

      // Send to affected users if any
      if (incident.affectedUsers && incident.affectedUsers.length > 0) {
        for (const userEmail of incident.affectedUsers) {
          await this.sendEmail(
            userEmail,
            "Security Alert: Suspicious Activity Detected",
            html,
          );
        }
      }

      this.logger.log(`Security incident alert sent for: ${incident.type}`);
    } catch (error) {
      this.logger.error(`Failed to send security incident alert:`, error);
      throw error;
    }
  }

  async notifySystemIssue(issue: {
    type: string;
    description: string;
    status: string;
    severity: "low" | "medium" | "high" | "critical";
  }): Promise<void> {
    try {
      // Send email notification
      const html = SecurityTemplates.systemIssue({
        issue: issue.description,
        time: new Date().toISOString(),
        status: issue.status,
        severity: issue.severity,
      });

      const adminEmail =
        this.configService.get<string>("ADMIN_EMAIL") ||
        "jeffrey.lau@zenovateai.agency";
      await this.sendEmail(
        adminEmail,
        `System Issue Alert: ${issue.type} (${issue.severity.toUpperCase()})`,
        html,
      );

      // Send Slack notification
      await this.slackNotificationService.notifySystemIssue(issue);

      this.logger.log(`System issue notification sent (email + Slack) for: ${issue.type}`);
    } catch (error) {
      this.logger.error(`Failed to send system issue notification:`, error);
      throw error;
    }
  }
}
