import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizationSubscription } from "../organization-subscriptions/entities/organization-subscription.entity";
import { OrganizationSubscriptionsModule } from "../organization-subscriptions/organization-subscriptions.module";
import { Organizations } from "../organizations/entities/organizations.entity";
import { OrganizationsModule } from "../organizations/organizations.module";
import { UsageMetricsModule } from "../usage-metrics/usage-metrics.module";

import { UsageEvent } from "./entities/usage-event.entity";
import { UsageEventsController } from "./usage-events.controller";
import { UsageEventsService } from "./usage-events.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageEvent,
      OrganizationSubscription,
      Organizations,
    ]),
    OrganizationSubscriptionsModule,
    OrganizationsModule,
    UsageMetricsModule,
  ],
  controllers: [UsageEventsController],
  providers: [UsageEventsService],
  exports: [UsageEventsService],
})
export class UsageEventsModule {}
