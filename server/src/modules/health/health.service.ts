import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  async getHealthStatus() {
    const startTime = process.hrtime();
    const uptime = process.uptime();

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      environment: this.configService.get("app.environment", "development"),
      version: this.configService.get("app.version", "1.0.0"),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
      pid: process.pid,
      nodeVersion: process.version,
    };
  }
}
