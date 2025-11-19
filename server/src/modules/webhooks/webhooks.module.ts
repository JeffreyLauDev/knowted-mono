import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Organizations } from "../organizations/entities/organizations.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { Webhook } from "./entities/webhook.entity";
import { WebhookNotificationService } from "./webhook-notification.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, Organizations]),
    OrganizationsModule,
    PermissionsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookNotificationService],
  exports: [WebhooksService, WebhookNotificationService],
})
export class WebhooksModule {}
