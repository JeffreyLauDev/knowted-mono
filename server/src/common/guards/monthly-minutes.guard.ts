import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { UsageEventsService } from "../../modules/usage-events/usage-events.service";

export const MONTHLY_MINUTES_KEY = "monthly_minutes";
export const RequireMonthlyMinutes =
  () => (target: unknown, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      MONTHLY_MINUTES_KEY,
      true,
      descriptor?.value ?? target,
    );
  };

@Injectable()
export class MonthlyMinutesGuard implements CanActivate {
  private readonly logger = new Logger(MonthlyMinutesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usageEventsService: UsageEventsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isMonthlyMinutesRequired = this.reflector.getAllAndOverride<boolean>(
      MONTHLY_MINUTES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isMonthlyMinutesRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId =
      request.params.organizationId ||
      request.body.organizationId ||
      request.query.organizationId;

    if (!organizationId) {
      this.logger.warn(
        "No organization ID found in request for monthly minutes check",
      );
      return true; // Allow if no org ID (might be a different type of request)
    }

    try {
      // Check monthly minutes usage
      const usageData =
        await this.usageEventsService.getMonthlyMinutesUsage(organizationId);

      if (!usageData.canInviteKnowted) {
        throw new ForbiddenException({
          message: "Monthly minutes limit exceeded",
          error: "MONTHLY_MINUTES_LIMIT_EXCEEDED",
          currentUsage: usageData.currentUsage,
          monthlyLimit: usageData.monthlyLimit,
          usagePercentage: usageData.usagePercentage,
          resetDate: usageData.resetDate,
          upgradeRequired: true,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error checking monthly minutes for organization ${organizationId}:`,
        error,
      );
      // If there's an error checking monthly minutes, allow the request to proceed
      // This prevents blocking legitimate requests due to system issues
      return true;
    }
  }
}
