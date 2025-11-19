import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AiModule } from "../ai/ai.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { TeamsModule } from "../teams/teams.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import { MeetingType } from "./entities/meeting_types.entity";
import { MeetingTypesController } from "./meeting_types.controller";
import { MeetingTypesService } from "./meeting_types.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingType, UserOrganization]),
    OrganizationsModule,
    PermissionsModule,
    TeamsModule,
    UsageEventsModule,
    ApiKeysModule,
    forwardRef(() => AiModule),
  ],
  controllers: [MeetingTypesController],
  providers: [MeetingTypesService],
  exports: [MeetingTypesService],
})
export class MeetingTypesModule {}
