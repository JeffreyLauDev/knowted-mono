import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Meetings } from "../meetings/entities/meetings.entity";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import { CalendarManageService } from "./calendar-manage.service";
import { CalendarSyncService } from "./calendar-sync.service";
import { CalendarController } from "./calendar.controller";
import { Calendars } from "./entities/calendars.entity";
import { MeetingBaasIntegrationService } from "./meetingbaas-integration.service";
import { MeetingBaasWebhookController } from "./meetingbaas-webhook.controller";
import { OAuthProviderService } from "./oauth-provider.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Meetings, Calendars, UserOrganization]),
    OrganizationsModule,
    PermissionsModule,
    UsageEventsModule,
    forwardRef(() =>
      import("../meetings/meetings.module").then((m) => m.MeetingsModule),
    ),
  ],
  controllers: [CalendarController, MeetingBaasWebhookController],
  providers: [
    MeetingBaasIntegrationService,
    CalendarSyncService,
    CalendarManageService,
    OAuthProviderService,
  ],
  exports: [
    MeetingBaasIntegrationService,
    CalendarSyncService,
    CalendarManageService,
  ],
})
export class CalendarModule {}
