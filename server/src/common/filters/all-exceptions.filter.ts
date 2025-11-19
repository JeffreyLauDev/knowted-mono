import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";

import { Request, Response } from "express";

import { EmailService } from "../../modules/email/email.service";
import { PinoLoggerService } from "../logger/pino-logger.service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(PinoLoggerService) private readonly logger: PinoLoggerService,
    private readonly emailService: EmailService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the full error details using structured logging
    this.logger.logException(
      exception instanceof Error ? exception : new Error(String(exception)),
      AllExceptionsFilter.name,
      {
        path: request.url,
        method: request.method,
        statusCode: status,
        userAgent: request.get("User-Agent"),
        ip: request.ip || request.connection.remoteAddress,
        userId: (request as any).user?.id,
        organizationId: (request as any).user?.organizationId,
        body: request.body,
        query: request.query,
        params: request.params,
      },
    );

    // Check for critical system errors and send alerts
    if (exception instanceof Error) {
      this.checkForCriticalErrors(exception, request.url, status);
    }

    // Safely extract error message to avoid circular reference issues
    let errorMessage = "Internal server error";
    if (exception instanceof Error) {
      errorMessage = exception.message;
    } else if (typeof exception === "string") {
      errorMessage = exception;
    }

    // Only include error details in development, and only if it's safe to serialize
    let errorDetails: any = undefined;
    if (process.env.NODE_ENV === "development" && exception instanceof Error) {
      // Only include safe, serializable properties
      errorDetails = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
      error: errorDetails,
    });
  }

  private async checkForCriticalErrors(
    error: Error,
    url: string,
    status: number,
  ) {
    try {
      const criticalKeywords = [
        "database",
        "connection",
        "timeout",
        "memory",
        "disk",
        "stripe",
        "supabase",
      ];
      const isCritical = criticalKeywords.some((keyword) =>
        error.message.toLowerCase().includes(keyword),
      );

      // Also check for 500+ status codes
      const isServerError = status >= 500;

      if (isCritical || isServerError) {
        const severity = isCritical ? "high" : "medium";

        await this.emailService.notifySystemIssue({
          type: "system_error",
          description: `Critical system error at ${url}: ${error.message}`,
          status: "investigating",
          severity: severity as "low" | "medium" | "high" | "critical",
        });

        this.logger.error(
          `Critical system error detected and alert sent: ${error.message}`,
        );
      }
    } catch (alertError) {
      this.logger.error("Failed to send system error alert:", alertError);
      // Don't throw error to avoid breaking the response
    }
  }
}
