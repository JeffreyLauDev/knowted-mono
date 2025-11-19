import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Client } from "@opensearch-project/opensearch";

@Injectable()
export class OpenSearchLoggerService {
  private client: Client;
  private enabled: boolean;
  private index: string;
  private batchSize: number;
  private flushInterval: number;
  private logBuffer: any[] = [];
  private flushTimer: NodeJS.Timeout;
  private readonly logger = new Logger(OpenSearchLoggerService.name);

  constructor(private configService: ConfigService) {
    const opensearchConfig = this.configService.get("opensearch");
    this.enabled = opensearchConfig?.enabled || false;
    this.index = opensearchConfig?.index || "knowted-logs";
    this.batchSize = opensearchConfig?.batchSize || 100;
    this.flushInterval = opensearchConfig?.flushInterval || 5000;

    if (this.enabled) {
      this.client = new Client({
        node: opensearchConfig.node,
        auth: {
          username: opensearchConfig.username,
          password: opensearchConfig.password,
        },
        ssl: {
          rejectUnauthorized: false, // For DigitalOcean compatibility
        },
      });

      this.logger.log(
        `OpenSearch logger initialized: ${opensearchConfig.node}`,
      );
      this.startFlushTimer();
    }
  }

  async log(level: string, message: string, data: any = {}) {
    if (!this.enabled) return;

    const logEntry = {
      "@timestamp": new Date().toISOString(),
      level,
      msg: message,
      time: Date.now(),
      pid: process.pid,
      hostname: require("os").hostname(),
      ...data,
    };

    this.logBuffer.push(logEntry);

    if (this.logBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flush();
      }
    }, this.flushInterval);
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const body = [];
      for (const log of logsToSend) {
        body.push({ index: { _index: this.index } });
        body.push(log);
      }

      await this.client.bulk({
        body,
        refresh: true,
      });
    } catch (error) {
      this.logger.error(`Failed to send logs to OpenSearch: ${error.message}`);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToSend);
    }
  }

  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.logBuffer.length > 0) {
      await this.flush();
    }
  }
}
