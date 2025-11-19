import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";

import { RequirePermission } from "./decorators/require-permission.decorator";
import { BulkSetTeamPermissionsDto } from "./dto/bulk-set-team-permissions.dto";
import { Permissions } from "./entities/permissions.entity";
import { PermissionGuard } from "./guards/permission.guard";
import { PermissionsService } from "./permissions.service";

@ApiTags("Permissions")
@ApiBearerAuth("access-token")
@Controller("api/v1/permissions")
@UseGuards(JwtOrApiKeyAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get(":teamId")
  @ApiOperation({ summary: "Get all permissions for a team" })
  @ApiParam({
    name: "teamId",
    description: "ID of the team to get permissions for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Returns all permissions for the team",
  })
  @ApiResponse({ status: 404, description: "Team not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getTeamPermissions(
    @Param("teamId") teamId: string,
    @Query("organization_id") organizationId: string,
  ) {
    return this.permissionsService.findByTeam(organizationId, teamId);
  }

  @Get()
  @ApiOperation({ summary: "Get all permissions for an organization" })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Returns all permissions for the organization",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @RequirePermission("permissions", "read")
  async getOrganizationPermissions(
    @Query("organization_id") organizationId: string,
  ) {
    return this.permissionsService.findByOrganization(organizationId);
  }

  @Put(":teamId/bulk")
  @RequirePermission("permissions", "readWrite")
  @ApiOperation({
    summary: "Bulk set permissions for a team",
    description:
      "Create or update multiple permissions for a team at once. This endpoint supports both general resource type permissions (without resource_id) and specific resource permissions (with resource_id).",
  })
  @ApiParam({
    name: "teamId",
    description: "ID of the team to set permissions for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    description: "Organization ID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Permissions set successfully",
    type: [Permissions],
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 404, description: "Team not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiBody({
    type: [BulkSetTeamPermissionsDto],
    description: "Array of permissions to set",
    examples: {
      example1: {
        summary: "Set general resource type permissions",
        value: [
          {
            resource_type: "reports",
            access_level: "readWrite",
          },
          {
            resource_type: "teams",
            access_level: "read",
          },
          {
            resource_type: "permissions",
            access_level: "read",
          },
        ],
      },
      example2: {
        summary: "Set specific resource permissions",
        value: [
          {
            resource_type: "meeting_types",
            resource_id: "4d3acea1-dcab-4b40-aa1d-277d3cdf678b",
            access_level: "readWrite",
          },
          {
            resource_type: "report_types",
            resource_id: "96651e7f-dc75-4a46-abd3-49ea97bfb9bb",
            access_level: "none",
          },
        ],
      },
    },
  })
  @RequirePermission("teams", "readWrite")
  async bulkSetTeamPermissions(
    @Param("teamId") teamId: string,
    @Query("organization_id") organizationId: string,
    @Body() permissions: BulkSetTeamPermissionsDto[],
  ) {
    return this.permissionsService.bulkSetTeamPermissions(
      organizationId,
      teamId,
      permissions,
    );
  }
}
