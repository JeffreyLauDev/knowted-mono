import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { OrganizationsService } from "../../modules/organizations/organizations.service";

@Injectable()
export class OrganizationMembershipGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId =
      request.query.organization_id || request.params.organizationId;
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
