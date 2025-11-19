import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

import { Request } from "express";
import { Repository } from "typeorm";

import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { Organizations } from "../../organizations/entities/organizations.entity";
import { UserOrganization } from "../../organizations/entities/user-organization.entity";
import { PermissionsService } from "../permissions.service";
import {
  AccessLevel,
  ResourceType,
  SPECIFIC_RESOURCE_TYPES,
  SpecificResourceType,
} from "../types/permissions.types";

export const PERMISSION_KEY = "permission";

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Organizations)
    private readonly organizationsRepository: Repository<Organizations>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug("Public endpoint, skipping permission check");
      return true;
    }

    const permission = this.reflector.get<{
      resource: ResourceType;
      action: AccessLevel;
      getResourceId?: (request: Request) => string | null;
    }>(PERMISSION_KEY, context.getHandler());

    this.logger.debug("=== Permission Guard Start ===");
    this.logger.debug(
      "Request path:",
      context.switchToHttp().getRequest().path,
    );
    this.logger.debug(
      "Request method:",
      context.switchToHttp().getRequest().method,
    );
    this.logger.debug("Permission metadata:", permission);

    if (!permission) {
      this.logger.debug("No permission metadata found, allowing access");
      return true;
    }

    // Reject organization permissions as they should always be accessible
    if (permission.resource === "organization") {
      this.logger.debug(
        "Organization permissions are always granted - rejecting decorator usage",
      );
      throw new UnauthorizedException(
        `Invalid permission decorator: @RequirePermission('organization', '${permission.action}') is not allowed. Organization access is always available for authenticated users.`,
      );
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const organizationId =
      request.params.organizationId ||
      request.query.organizationId ||
      request.query.organization_id ||
      request.body.organizationId ||
      request.body.organization_id;

    this.logger.debug("=== Request Details ===");
    this.logger.debug("userId:", userId);
    this.logger.debug("organizationId:", organizationId);
    this.logger.debug("Request params:", request.params);
    this.logger.debug("Request body:", request.body);
    this.logger.debug("Request query:", request.query);

    if (!userId || !organizationId) {
      this.logger.debug(
        "Missing required parameters - userId or organizationId",
      );
      throw new UnauthorizedException("Missing required parameters");
    }

    // Get user's teams in this organization
    this.logger.debug("=== Fetching User's Teams ===");
    const userOrgs = await this.userOrganizationRepository.find({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
      relations: ["team"],
    });

    const teams = userOrgs.map((userOrg) => userOrg.team);
    this.logger.debug("Teams found:", teams);

    // Check if user is in admin team (this covers owners too since they're in admin team)
    const isAdmin = teams.some((team) => team.is_admin);
    if (isAdmin) {
      this.logger.debug("User is in admin team, granting access");
      this.logger.debug("=== Permission Guard End (Success - Admin) ===");
      return true;
    }

    // Get the resource ID based on the permission metadata
    this.logger.debug("=== Getting Resource ID ===");
    this.logger.debug("Resource type:", permission.resource);
    let resourceId: string | null = null;

    if (permission.getResourceId) {
      // If getResourceId function is provided, use it to get the ID
      resourceId = permission.getResourceId(request);
    } else {
      // Fallback to the old behavior
      resourceId = await this.permissionsService.getResourceIdForPermission(
        permission.resource,
        request,
      );
    }

    this.logger.debug("Resource ID found:", resourceId);

    // Check if any team has the required permission
    this.logger.debug("=== Checking Permissions ===");
    this.logger.debug("Required action:", permission.action);
    for (const team of teams) {
      this.logger.debug(`Checking permissions for team ${team.id}`);
      const hasPermission = await this.permissionsService.checkPermission(
        team.id,
        permission.resource,
        SPECIFIC_RESOURCE_TYPES.includes(
          permission.resource as SpecificResourceType,
        )
          ? (resourceId as string)
          : null,
        permission.action,
      );
      this.logger.debug(`Team ${team.id} hasPermission:`, hasPermission);

      if (hasPermission) {
        this.logger.debug("Permission granted for team:", team.id);
        this.logger.debug("=== Permission Guard End (Success) ===");
        return true;
      }
    }

    this.logger.debug("No team has the required permission");
    this.logger.debug("=== Permission Guard End (Failed) ===");
    throw new UnauthorizedException(
      "You do not have permission to perform this action",
    );
  }
}
