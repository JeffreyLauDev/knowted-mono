import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsageMetrics } from "./entities/usage-metrics.entity";
import { UsageMetricsService } from "./usage-metrics.service";

@Module({
  imports: [TypeOrmModule.forFeature([UsageMetrics])],
  providers: [UsageMetricsService],
  exports: [UsageMetricsService],
})
export class UsageMetricsModule {}
