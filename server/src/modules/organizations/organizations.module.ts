import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiKeysModule } from "../api-keys/api-keys.module";
import { Calendars } from "../calendar/entities/calendars.entity";
import { EmailModule } from "../email/email.module";
import { MeetingType } from "../meeting_types/entities/meeting_types.entity";
import { PermissionsModule } from "../permissions/permissions.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { SeatManagementModule } from "../seat-management/seat-management.module";
import { Teams } from "../teams/entities/teams.entity";
import { TeamsModule } from "../teams/teams.module";

import { OrganizationInvite } from "./entities/organization-invite.entity";
import { Organizations } from "./entities/organizations.entity";
import { UserOrganization } from "./entities/user-organization.entity";
import { OrganizationMembershipGuard } from "./guards/organization-membership.guard";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organizations,
      UserOrganization,
      OrganizationInvite,
      Teams,
      MeetingType,
      Calendars,
    ]),
    forwardRef(() => TeamsModule),
    forwardRef(() => ProfilesModule),
    forwardRef(() => PermissionsModule),
    EmailModule,
    SeatManagementModule,
    forwardRef(() => ApiKeysModule),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationMembershipGuard],
  exports: [OrganizationsService, TypeOrmModule, OrganizationMembershipGuard],
})
export class OrganizationsModule {}
