import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiKeysModule } from "../api-keys/api-keys.module";
import { Meetings } from "../meetings/entities/meetings.entity";
import { Organizations } from "../organizations/entities/organizations.entity";
import { UserOrganization } from "../organizations/entities/user-organization.entity";

import { Profile } from "./entities/profile.entity";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      Meetings,
      Organizations,
      UserOrganization,
    ]),
    ApiKeysModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
