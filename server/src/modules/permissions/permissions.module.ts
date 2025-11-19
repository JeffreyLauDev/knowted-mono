import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiKeysModule } from "../api-keys/api-keys.module";
import { Organizations } from "../organizations/entities/organizations.entity";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { Teams } from "../teams/entities/teams.entity";

import { Permissions } from "./entities/permissions.entity";
import { PermissionGuard } from "./guards/permission.guard";
import { PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permissions,
      UserOrganization,
      Teams,
      Organizations,
    ]),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => ApiKeysModule),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule {}
