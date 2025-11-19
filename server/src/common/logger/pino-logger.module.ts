import { Global, Module } from "@nestjs/common";

import { SlackNotificationService } from "../../services/slack-notification.service";

import { PinoLoggerService } from "./pino-logger.service";

@Global()
@Module({
  providers: [PinoLoggerService, SlackNotificationService],
  exports: [PinoLoggerService],
})
export class PinoLoggerModule {}
