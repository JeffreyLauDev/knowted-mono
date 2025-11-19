import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiModule } from "../ai/ai.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { ApiKey } from "../api-keys/entities/api-key.entity";
import { CalendarSyncService } from "../calendar/calendar-sync.service";
import { MeetingBaasIntegrationService } from "../calendar/meetingbaas-integration.service";
import { OAuthProviderService } from "../calendar/oauth-provider.service";
import { EmailModule } from "../email/email.module";
import { MeetingType } from "../meeting_types/entities/meeting_types.entity";
import { MeetingTypesModule } from "../meeting_types/meeting_types.module";
import { Organizations } from "../organizations/entities/organizations.entity";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { ReportTypes } from "../report_types/entities/report_types.entity";
import { ReportTypesModule } from "../report_types/report_types.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { Teams } from "../teams/entities/teams.entity";
import { TeamsModule } from "../teams/teams.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

import { MeetingShares } from "./entities/meeting-shares.entity";
import { Meetings } from "./entities/meetings.entity";
import { ExternalMeetingsController } from "./external-meetings.controller";
import { MeetingSharesService } from "./meeting-shares.service";
import { MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { PublicMeetingsController } from "./public-meetings.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meetings,
      MeetingShares,
      MeetingType,
      Organizations,
      ReportTypes,
      Teams,
      UserOrganization,
      ApiKey,
    ]),
    forwardRef(() => TeamsModule),
    forwardRef(() => MeetingTypesModule),
    forwardRef(() => ReportTypesModule),
    forwardRef(() => ProfilesModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => PermissionsModule),
    ApiKeysModule,
    AiModule,
    UsageEventsModule,
    SupabaseModule,
    EmailModule,
    WebhooksModule,
  ],
  controllers: [
    MeetingsController,
    PublicMeetingsController,
    ExternalMeetingsController,
  ],
  providers: [
    MeetingsService,
    MeetingSharesService,
    MeetingBaasIntegrationService,
    CalendarSyncService,
    OAuthProviderService,
    OrganizationMembershipGuard,
  ],
  exports: [MeetingsService, MeetingSharesService],
})
export class MeetingsModule {}
