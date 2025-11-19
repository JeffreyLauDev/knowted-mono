import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import {
  OrganizationSubscription,
  SubscriptionStatus,
} from "../../modules/organization-subscriptions/entities/organization-subscription.entity";

export const REQUIRE_ACTIVE_SUBSCRIPTION_KEY = "requireActiveSubscription";

export const RequireActiveSubscription = () =>
  SetMetadata(REQUIRE_ACTIVE_SUBSCRIPTION_KEY, true);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(OrganizationSubscription)
    private readonly orgSubRepo: Repository<OrganizationSubscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireActiveSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ACTIVE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireActiveSubscription) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId =
      request.params.organizationId ||
      request.body.organizationId ||
      request.query.organizationId;

    if (!organizationId) {
      this.logger.warn(
        "No organization ID found in request for subscription check",
      );
      return true; // Allow if no org ID (might be a different type of request)
    }

    try {
      // Check if organization has an active subscription
      const subscription = await this.orgSubRepo.findOne({
        where: { organization_id: organizationId },
      });

      if (!subscription) {
        throw new ForbiddenException({
          message: "No subscription found",
          error: "NO_SUBSCRIPTION",
          upgradeRequired: true,
        });
      }

      // Check if subscription is active
      const isActive = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
      ].includes(subscription.status);

      if (!isActive) {
        throw new ForbiddenException({
          message: "Subscription is not active",
          error: "INACTIVE_SUBSCRIPTION",
          currentStatus: subscription.status,
          upgradeRequired: true,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error checking subscription for organization ${organizationId}:`,
        error,
      );
      // If there's an error checking subscription, allow the request to proceed
      // This prevents blocking legitimate requests due to system issues
      return true;
    }
  }
}
