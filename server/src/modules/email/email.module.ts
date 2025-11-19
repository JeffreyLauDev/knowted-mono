import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { SlackNotificationService } from "../../services/slack-notification.service";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule],
  providers: [EmailService, SlackNotificationService],
  exports: [EmailService],
})
export class EmailModule {}
