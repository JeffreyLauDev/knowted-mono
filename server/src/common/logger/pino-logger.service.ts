import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";

import { PinoLogger } from "nestjs-pino";

import { SlackNotificationService } from "../../services/slack-notification.service";

@Injectable()
export class PinoLoggerService implements NestLoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly slackService?: SlackNotificationService,
  ) {}

  // Basic logging methods
  log(message: string, context?: string, meta?: any): void {
    this.logger.info({ context, ...meta }, message);
  }

  error(message: string, trace?: string, context?: string, meta?: any): void {
    this.logger.error({ trace, context, ...meta }, message);

    // Send Slack notification for errors if SlackService is available
    if (this.slackService) {
      this.slackService
        .sendLogNotification("error", message, context, { trace })
        .catch((error) => {
          console.error("Failed to send error notification to Slack:", error);
        });
    }
  }

  warn(message: string, context?: string, meta?: any): void {
    this.logger.warn({ context, ...meta }, message);

    // Send Slack notification for warnings if SlackService is available
    if (this.slackService) {
      this.slackService
        .sendLogNotification("warn", message, context)
        .catch((error) => {
          console.error("Failed to send warning notification to Slack:", error);
        });
    }
  }

  debug(message: string, context?: string, meta?: any): void {
    this.logger.debug({ context, ...meta }, message);
  }

  verbose(message: string, context?: string, meta?: any): void {
    this.logger.trace({ context, ...meta }, message);
  }

  // NestJS LoggerService interface methods
  setContext(context: string): void {
    this.logger.setContext(context);
  }

  setLogLevels(levels: string[]): void {
    // Pino doesn't support dynamic log levels like NestJS
    // This is a no-op for compatibility
  }

  // Structured logging methods
  logHttpRequest(req: any, res: any, responseTime: number): void {
    this.logger.info(
      {
        type: "http_request",
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get("User-Agent"),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
      },
      `HTTP ${req.method} ${req.url} - ${res.statusCode}`,
    );
  }

  logException(exception: Error, context?: string, meta?: any): void {
    this.logger.error(
      {
        type: "exception",
        context,
        error: {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        },
        ...meta,
      },
      `Exception: ${exception.message}`,
    );
  }

  logDatabaseQuery(query: string, duration: number, params?: any[]): void {
    this.logger.debug(
      {
        type: "database_query",
        query: query.replace(/\s+/g, " ").trim(),
        duration: `${duration}ms`,
        params: params?.length ? params : undefined,
      },
      `Database Query: ${duration}ms`,
    );
  }

  logBusinessEvent(event: string, data?: any): void {
    this.logger.info(
      {
        type: "business_event",
        event,
        timestamp: new Date().toISOString(),
        ...data,
      },
      `Business Event: ${event}`,
    );
  }

  // Authentication and authorization logging
  logAuthEvent(event: string, userId?: string, meta?: any): void {
    this.logger.info(
      {
        type: "auth_event",
        event,
        userId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
      `Auth Event: ${event}`,
    );
  }

  // Payment and subscription logging
  logPaymentEvent(
    event: string,
    userId?: string,
    organizationId?: string,
    meta?: any,
  ): void {
    this.logger.info(
      {
        type: "payment_event",
        event,
        userId,
        organizationId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
      `Payment Event: ${event}`,
    );
  }

  // AI and meeting logging
  logAIEvent(
    event: string,
    userId?: string,
    meetingId?: string,
    meta?: any,
  ): void {
    this.logger.info(
      {
        type: "ai_event",
        event,
        userId,
        meetingId,
        timestamp: new Date().toISOString(),
        ...meta,
      },
      `AI Event: ${event}`,
    );
  }

  // Performance logging
  logPerformance(operation: string, duration: number, meta?: any): void {
    this.logger.info(
      {
        type: "performance",
        operation,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        ...meta,
      },
      `Performance: ${operation} - ${duration}ms`,
    );
  }

  // Security logging
  logSecurityEvent(
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    meta?: any,
  ): void {
    const level =
      severity === "critical" || severity === "high" ? "error" : "warn";
    this.logger[level](
      {
        type: "security_event",
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...meta,
      },
      `Security Event: ${event} (${severity})`,
    );
  }

  // Get the underlying Pino logger for advanced usage
  getPinoLogger(): PinoLogger {
    return this.logger;
  }
}
