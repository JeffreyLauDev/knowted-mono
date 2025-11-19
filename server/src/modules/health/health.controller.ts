import { Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("api/v1/health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2025-09-03T07:45:00.000Z" },
        uptime: { type: "number", example: 12345 },
        environment: { type: "string", example: "development" },
        version: { type: "string", example: "1.0.0" },
      },
    },
  })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Post()
  @ApiOperation({ summary: "Health check endpoint (POST method)" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2025-09-03T07:45:00.000Z" },
        uptime: { type: "number", example: 12345 },
        environment: { type: "string", example: "development" },
        version: { type: "string", example: "1.0.0" },
      },
    },
  })
  async postHealth() {
    return this.healthService.getHealthStatus();
  }
}
