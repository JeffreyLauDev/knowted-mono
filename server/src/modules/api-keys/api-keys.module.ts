import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Organizations } from "../organizations/entities/organizations.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { ApiKey } from "./entities/api-key.entity";
import { ApiKeyAuthGuard } from "./guards/api-key-auth.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, Organizations]),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
