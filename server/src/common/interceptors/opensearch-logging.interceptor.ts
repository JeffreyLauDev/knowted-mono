import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { OpenSearchLoggerService } from "../../services/opensearch-logger.service";

@Injectable()
export class OpenSearchLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(OpenSearchLoggerService)
    private readonly opensearchLogger: OpenSearchLoggerService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logRequest(request, response, startTime, null, data);
        },
        error: (error) => {
          this.logRequest(request, response, startTime, error, null);
        },
      }),
    );
  }

  private async logRequest(
    req: any,
    res: any,
    startTime: number,
    error: any,
    data: any,
  ) {
    // Only send to OpenSearch in production
    const isProduction =
      this.configService.get("app.environment") === "production";
    const opensearchConfig = this.configService.get("opensearch");
    const isOpenSearchEnabled = opensearchConfig?.enabled;

    if (!isProduction || !isOpenSearchEnabled) {
      return; // Skip OpenSearch logging in development
    }

    const responseTime = Date.now() - startTime;
    const level = error ? "error" : res.statusCode >= 400 ? "warn" : "info";

    // Extract endpoint path without query parameters
    const endpoint = req.url.split("?")[0];

    const logData = {
      req: {
        id: req.id,
        method: req.method,
        url: req.url,
        endpoint: endpoint,
        query: req.query,
        params: req.params,
        headers: req.headers,
        remoteAddress: req.ip || req.connection?.remoteAddress,
        remotePort: req.connection?.remotePort,
      },
      res: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        data: this.sanitizeResponseData(data),
      },
      responseTime,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      requestId: req.id,
      context: "HTTP",
    };

    if (error) {
      logData["err"] = {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const message = error
      ? `${req.method} ${req.url} - ${error.message}`
      : `${req.method} ${req.url}`;

    // Send to OpenSearch (only in production)
    await this.opensearchLogger.log(level, message, logData);
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return null;

    // Convert to string to check size
    const dataString = JSON.stringify(data);
    const maxSize = 10000; // 10KB limit

    if (dataString.length > maxSize) {
      return {
        _truncated: true,
        _size: dataString.length,
        _message: "Response data too large, truncated for logging",
        preview: dataString.substring(0, 1000) + "...",
      };
    }

    // Sanitize sensitive fields
    const sanitized = this.removeSensitiveFields(data);
    return sanitized;
  }

  private removeSensitiveFields(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
      "auth",
      "access_token",
      "refresh_token",
      "api_key",
      "private_key",
      "ssn",
      "credit_card",
      "cvv",
      "pin",
      "otp",
    ];

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeSensitiveFields(item));
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive information
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = this.removeSensitiveFields(sanitized[key]);
      }
    }

    return sanitized;
  }
}
