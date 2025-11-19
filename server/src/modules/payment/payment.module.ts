import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OrganizationSubscription } from "../organization-subscriptions/entities/organization-subscription.entity";
import { OrganizationSubscriptionsModule } from "../organization-subscriptions/organization-subscriptions.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { PricingPlan } from "../pricing/entities/pricing-plan.entity";
import { PricingModule } from "../pricing/pricing.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { SeatManagementModule } from "../seat-management/seat-management.module";
import { UsageEventsModule } from "../usage-events/usage-events.module";

import {
  PaymentController,
  StripeWebhookController,
} from "./payment.controller";
import { PaymentService } from "./payment.service";
import { PublicPaymentController } from "./public-payment.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationSubscription, PricingPlan]),
    OrganizationSubscriptionsModule,
    OrganizationsModule,
    PermissionsModule,
    ProfilesModule,
    PricingModule,
    SeatManagementModule,
    UsageEventsModule,
  ],
  controllers: [
    PaymentController,
    StripeWebhookController,
    PublicPaymentController,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
