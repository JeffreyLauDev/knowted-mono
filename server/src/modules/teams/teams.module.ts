import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsageMetricsModule } from "../usage-metrics/usage-metrics.module";

import { Teams } from "./entities/teams.entity";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Teams, UserOrganization]),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => PermissionsModule),
    UsageMetricsModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
