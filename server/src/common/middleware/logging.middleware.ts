import { Inject, Injectable, NestMiddleware } from "@nestjs/common";

import { NextFunction, Request, Response } from "express";

import { PinoLoggerService } from "../logger/pino-logger.service";

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(PinoLoggerService) private readonly logger: PinoLoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;

      // Only log errors (4xx, 5xx) and requests with errors
      // Skip successful requests (2xx, 3xx) to reduce console noise
      if (res.statusCode >= 400 || (res as any).err) {
        this.logger.logHttpRequest(req, res, responseTime);
      }

      // Call the original end method
      originalEnd.call(this, chunk, encoding);
    }.bind(this);

    next();
  }
}
