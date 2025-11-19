import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiKeysModule } from "../api-keys/api-keys.module";
import { EmailModule } from "../email/email.module";
import { MeetingsModule } from "../meetings/meetings.module";
import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtOrApiKeyAuthGuard } from "./guards/jwt-or-api-key-auth.guard";
import { SupabaseJwtStrategy } from "./strategies/supabase-jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    TypeOrmModule.forFeature([UserOrganization]),
    forwardRef(() => ProfilesModule),
    OrganizationsModule,
    PermissionsModule,
    MeetingsModule,
    UsageEventsModule,
    EmailModule,
    ApiKeysModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy, JwtOrApiKeyAuthGuard],
  exports: [PassportModule, AuthService, JwtOrApiKeyAuthGuard],
})
export class AuthModule {}
