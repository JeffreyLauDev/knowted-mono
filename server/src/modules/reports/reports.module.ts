import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";
import { UsageMetricsModule } from "../usage-metrics/usage-metrics.module";

import { Reports } from "./entities/reports.entity";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Reports]),
    OrganizationsModule,
    PermissionsModule,
    UsageEventsModule,
    UsageMetricsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
