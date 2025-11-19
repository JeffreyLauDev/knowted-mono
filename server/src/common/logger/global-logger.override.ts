import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { OpenSearchLoggerService } from "../../services/opensearch-logger.service";
import { SlackNotificationService } from "../../services/slack-notification.service";

// Store original Logger methods
const originalLog = Logger.prototype.log;
const originalError = Logger.prototype.error;
const originalWarn = Logger.prototype.warn;
const originalDebug = Logger.prototype.debug;
const originalVerbose = Logger.prototype.verbose;

export function setupGlobalLoggerOverride(
  configService: ConfigService,
  opensearchLogger: OpenSearchLoggerService,
  slackService: SlackNotificationService,
) {
  const isProduction = configService.get("app.environment") === "production";
  const isOpenSearchEnabled = configService.get("opensearch")?.enabled || false;

  if (!isProduction || !isOpenSearchEnabled) {
    return; // Only override in production with OpenSearch enabled
  }

  // Override Logger methods to also send to OpenSearch
  Logger.prototype.log = function (message: any, context?: string) {
    originalLog.call(this, message, context);
    logToOpenSearch("info", message, context || this.context);
  };

  Logger.prototype.error = function (
    message: any,
    trace?: string,
    context?: string,
  ) {
    originalError.call(this, message, trace, context);
    logToOpenSearch("error", message, context || this.context, { trace });
    sendSlackNotification("error", message, context || this.context, { trace });
  };

  Logger.prototype.warn = function (message: any, context?: string) {
    originalWarn.call(this, message, context);
    logToOpenSearch("warn", message, context || this.context);
    sendSlackNotification("warn", message, context || this.context);
  };

  Logger.prototype.debug = function (message: any, context?: string) {
    originalDebug.call(this, message, context);
    logToOpenSearch("debug", message, context || this.context);
  };

  Logger.prototype.verbose = function (message: any, context?: string) {
    originalVerbose.call(this, message, context);
    logToOpenSearch("verbose", message, context || this.context);
  };

  function logToOpenSearch(
    level: string,
    message: any,
    context?: string,
    additionalData?: any,
  ) {
    const logData = {
      level,
      message: typeof message === "string" ? message : JSON.stringify(message),
      context: context || "Application",
      service: "knowted-backend",
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: require("os").hostname(),
      type: "application-log",
      ...additionalData,
    };

    opensearchLogger.log(level, logData.message, logData).catch((error) => {
      console.error("Failed to send log to OpenSearch:", error);
    });
  }

  function sendSlackNotification(
    level: string,
    message: any,
    context?: string,
    additionalData?: any,
  ) {
    // Only send Slack notifications for warnings and errors
    if (level !== "warn" && level !== "error") {
      return;
    }

    // Use SlackService method for clean separation of concerns
    slackService
      .sendLogNotification(
        level as "warn" | "error",
        message,
        context,
        additionalData,
      )
      .catch((error) => {
        console.error("Failed to send notification to Slack:", error);
      });
  }
}
