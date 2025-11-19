import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SlackNotificationService {
  private readonly webhookUrl: string;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>("SLACK_WEBHOOK_URL");

    if (!this.webhookUrl) {
      console.warn(
        "SLACK_WEBHOOK_URL not configured. Slack notifications will be disabled.",
      );
    } else {
      console.log("Slack webhook URL configured successfully");
    }
  }

  async sendLogNotification(
    level: "warn" | "error",
    message: any,
    context?: string,
    additionalData?: any,
  ): Promise<void> {
    if (!this.webhookUrl) {
      console.warn("Slack webhook URL not configured. Skipping notification.");
      return;
    }

    try {
      const messageText =
        typeof message === "string" ? message : JSON.stringify(message);
      const contextText = context || "Application";
      const timestamp = new Date().toISOString();
      const hostname = require("os").hostname();

      // Create Slack message payload
      const slackMessage = {
        text: `🚨 Knowted Backend ${level.toUpperCase()}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 Knowted Backend ${level.toUpperCase()}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Level:*\n${level.toUpperCase()}`,
              },
              {
                type: "mrkdwn",
                text: `*Context:*\n${contextText}`,
              },
              {
                type: "mrkdwn",
                text: `*Time:*\n${timestamp}`,
              },
              {
                type: "mrkdwn",
                text: `*Server:*\n${hostname}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message:*\n\`\`\`${messageText}\`\`\``,
            },
          },
        ],
      };

      // Add stack trace if available
      if (additionalData?.trace) {
        slackMessage.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Stack Trace:*\n\`\`\`${additionalData.trace}\`\`\``,
          },
        });
      }

      // Add footer
      slackMessage.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_This is an automated notification from the Knowted backend system. Check OpenSearch for more detailed logs._`,
        },
      });

      // Send to Slack
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(
        `Slack notification sent successfully for ${level}: ${contextText}`,
      );
    } catch (error) {
      // Don't throw - this is notification, not critical functionality
      console.error("Failed to send Slack notification:", error);
    }
  }

  async sendSecurityIncidentAlert(incident: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    details: string;
    affectedUsers?: string[];
    ip?: string;
    userEmail?: string;
  }): Promise<void> {
    if (!this.webhookUrl) {
      console.warn(
        "Slack webhook URL not configured. Skipping security incident alert.",
      );
      return;
    }

    try {
      const severityEmoji = {
        low: "🟡",
        medium: "🟠",
        high: "🔴",
        critical: "🚨",
      };

      const slackMessage = {
        text: `Security Alert: ${incident.type}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${severityEmoji[incident.severity]} Security Alert: ${incident.type}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Type:*\n${incident.type}`,
              },
              {
                type: "mrkdwn",
                text: `*Severity:*\n${incident.severity.toUpperCase()}`,
              },
              {
                type: "mrkdwn",
                text: `*Time:*\n${new Date().toISOString()}`,
              },
              {
                type: "mrkdwn",
                text: `*IP:*\n${incident.ip || "N/A"}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Details:*\n${incident.details}`,
            },
          },
        ],
      };

      if (incident.userEmail) {
        slackMessage.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*User Email:*\n${incident.userEmail}`,
          },
        });
      }

      if (incident.affectedUsers && incident.affectedUsers.length > 0) {
        slackMessage.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Affected Users:*\n${incident.affectedUsers.join(", ")}`,
          },
        });
      }

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(`Security incident alert sent to Slack: ${incident.type}`);
    } catch (error) {
      console.error("Failed to send security incident alert to Slack:", error);
      throw error;
    }
  }

  async notifySystemIssue(issue: {
    type: string;
    description: string;
    status: string;
    severity: "low" | "medium" | "high" | "critical";
  }): Promise<void> {
    if (!this.webhookUrl) {
      console.warn(
        "Slack webhook URL not configured. Skipping system issue notification.",
      );
      return;
    }

    try {
      const severityEmoji = {
        low: "🟡",
        medium: "🟠",
        high: "🔴",
        critical: "🚨",
      };

      const slackMessage = {
        text: `System Issue: ${issue.type}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${severityEmoji[issue.severity]} System Issue: ${issue.type}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Type:*\n${issue.type}`,
              },
              {
                type: "mrkdwn",
                text: `*Severity:*\n${issue.severity.toUpperCase()}`,
              },
              {
                type: "mrkdwn",
                text: `*Status:*\n${issue.status}`,
              },
              {
                type: "mrkdwn",
                text: `*Time:*\n${new Date().toISOString()}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Description:*\n${issue.description}`,
            },
          },
        ],
      };

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(
          `Slack webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      console.log(`System issue notification sent to Slack: ${issue.type}`);
    } catch (error) {
      console.error(
        "Failed to send system issue notification to Slack:",
        error,
      );
      throw error;
    }
  }
}
