import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { SeatManagementService } from "../../modules/seat-management/seat-management.service";

export const SEAT_LIMIT_KEY = "seat_limit";
export const SeatLimit =
  () => (target: unknown, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(SEAT_LIMIT_KEY, true, descriptor?.value ?? target);
  };

@Injectable()
export class SeatLimitGuard implements CanActivate {
  private readonly logger = new Logger(SeatLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly seatManagementService: SeatManagementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSeatLimitRequired = this.reflector.getAllAndOverride<boolean>(
      SEAT_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isSeatLimitRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId =
      request.params.organizationId ||
      request.body.organizationId ||
      request.query.organizationId;

    if (!organizationId) {
      this.logger.warn(
        "No organization ID found in request for seat limit check",
      );
      return true; // Allow if no org ID (might be a different type of request)
    }

    try {
      // Check if organization needs to upgrade due to current seat usage
      const upgradeNeeded =
        await this.seatManagementService.checkUpgradeNeeded(organizationId);

      if (upgradeNeeded) {
        throw new ForbiddenException({
          message: "Seat limit exceeded",
          error: "SEAT_LIMIT_EXCEEDED",
          currentPlan: upgradeNeeded.currentPlan,
          currentSeats: upgradeNeeded.currentSeats,
          currentSeatLimit: upgradeNeeded.currentSeatLimit,
          recommendedPlan: upgradeNeeded.recommendedPlan,
          recommendedSeatLimit: upgradeNeeded.recommendedSeatLimit,
          upgradeReason: upgradeNeeded.upgradeReason,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error checking seat limits for organization ${organizationId}:`,
        error,
      );
      // If there's an error checking seat limits, allow the request to proceed
      // This prevents blocking legitimate requests due to system issues
      return true;
    }
  }
}
