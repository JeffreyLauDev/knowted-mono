import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizationSubscription } from "./entities/organization-subscription.entity";
import { ImmutableSubscriptionService } from "./immutable-subscription.service";
import { OrganizationSubscriptionsService } from "./organization-subscriptions.service";

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationSubscription])],
  providers: [OrganizationSubscriptionsService, ImmutableSubscriptionService],
  exports: [OrganizationSubscriptionsService, ImmutableSubscriptionService],
})
export class OrganizationSubscriptionsModule {}
