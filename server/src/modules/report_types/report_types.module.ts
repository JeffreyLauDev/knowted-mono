import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { TeamsModule } from "../teams/teams.module";

import { ReportTypes } from "./entities/report_types.entity";
import { ReportTypesController } from "./report_types.controller";
import { ReportTypesService } from "./report_types.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTypes, UserOrganization]),
    OrganizationsModule,
    PermissionsModule,
    TeamsModule,
  ],
  controllers: [ReportTypesController],
  providers: [ReportTypesService],
  exports: [ReportTypesService],
})
export class ReportTypesModule {}
