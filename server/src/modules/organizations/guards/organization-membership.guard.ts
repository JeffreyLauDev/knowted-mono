import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { SKIP_ORGANIZATION_MEMBERSHIP_KEY } from "../decorators/skip-organization-membership.decorator";
import { OrganizationsService } from "../organizations.service";

@Injectable()
export class OrganizationMembershipGuard implements CanActivate {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipOrganizationMembership =
      this.reflector.getAllAndOverride<boolean>(
        SKIP_ORGANIZATION_MEMBERSHIP_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (skipOrganizationMembership) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId =
      request.query.organization_id ||
      request.query.organizationId ||
      request.params.organizationId ||
      request.params.id; // Add support for :id parameter
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException("Invalid user authentication");
    }

    if (!organizationId) {
      throw new ForbiddenException("Organization ID is required");
    }

    try {
      const userOrgs = await this.organizationsService.getUserOrganizations(
        user.sub,
      );
      const hasAccess = userOrgs.some((org) => org.id === organizationId);

      if (!hasAccess) {
        throw new ForbiddenException(
          "You don't have access to this organization",
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException("Failed to verify organization membership");
    }
  }
}
