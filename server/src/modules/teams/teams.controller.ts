import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationMembershipGuard } from "../organizations/guards/organization-membership.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";

import { CreateTeamsDto } from "./dto/create-teams.dto";
import { TeamResponseDto } from "./dto/team-response.dto";
import { UpdateTeamsDto } from "./dto/update-teams.dto";
import { TeamsService } from "./teams.service";

@ApiTags("Teams")
@ApiBearerAuth("access-token")
@Controller("api/v1/teams")
@UseGuards(JwtAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new team",
    description:
      "Creates a new team in the specified organization. The organization ID must be provided as a query parameter.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    type: String,
    description: "The ID of the organization where the team will be created",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 201,
    description: "The team has been successfully created.",
    schema: {
      example: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Engineering Team",
        description: "Team responsible for software development",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid input data.",
    schema: {
      example: {
        statusCode: 400,
        message: ["name must be a string", "name should not be empty"],
        error: "Bad Request",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing authentication token.",
    schema: {
      example: {
        statusCode: 401,
        message: "Unauthorized",
        error: "Unauthorized",
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to the specified organization.",
    schema: {
      example: {
        statusCode: 403,
        message: "You don't have access to this organization",
        error: "Forbidden",
      },
    },
  })
  @RequirePermission("teams", "readWrite")
  create(
    @Body() createTeamsDto: CreateTeamsDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
  ) {
    return this.teamsService.create(createTeamsDto, organizationId, userId);
  }

  @Get()
  @ApiOperation({
    summary: "Get all teams for an organization",
    description:
      "Retrieves all teams that belong to the specified organization.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    type: String,
    description: "The ID of the organization to get teams from",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Returns an array of teams for the organization.",
    type: [TeamResponseDto],
    schema: {
      example: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Engineering Team",
          description: "Team responsible for software development",
          is_admin: false,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing authentication token.",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to the specified organization.",
  })
  @RequirePermission("teams", "read")
  findAll(
    @Query("organization_id") organizationId: string,
    @GetUser("id") userId: string,
  ) {
    return this.teamsService.findAll(organizationId, userId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a team by id",
    description:
      "Retrieves a specific team by its ID within the specified organization.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    type: String,
    description: "The ID of the organization that the team belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Returns the requested team.",
    type: TeamResponseDto,
    schema: {
      example: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Engineering Team",
        description: "Team responsible for software development",
        is_admin: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Team not found.",
    schema: {
      example: {
        statusCode: 404,
        message: "Team with ID 123e4567-e89b-12d3-a456-426614174000 not found",
        error: "Not Found",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing authentication token.",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to the specified organization.",
  })
  @RequirePermission("teams", "read")
  findOne(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @GetUser("id") userId: string,
  ) {
    return this.teamsService.findOne(id, organizationId, userId);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a team",
    description:
      "Updates an existing team's information within the specified organization.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    type: String,
    description: "The ID of the organization that the team belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "The team has been successfully updated.",
    schema: {
      example: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated Team Name",
        description: "Updated team description",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid input data.",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing authentication token.",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to the specified organization.",
  })
  @ApiResponse({
    status: 404,
    description: "Team not found.",
  })
  @RequirePermission("teams", "readWrite")
  update(
    @Param("id") id: string,
    @Body() updateTeamsDto: UpdateTeamsDto,
    @Query("organization_id") organizationId: string,
    @GetUser("id") userId: string,
  ) {
    return this.teamsService.update(id, updateTeamsDto, organizationId, userId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a team",
    description:
      "Deletes a team from the specified organization. This action cannot be undone.",
  })
  @ApiQuery({
    name: "organization_id",
    required: true,
    type: String,
    description: "The ID of the organization that the team belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "The team has been successfully deleted.",
    schema: {
      example: {
        message: "Team deleted successfully",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing authentication token.",
  })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - User does not have access to the specified organization.",
  })
  @ApiResponse({
    status: 404,
    description: "Team not found.",
  })
  @RequirePermission("teams", "readWrite")
  remove(
    @Param("id") id: string,
    @Query("organization_id") organizationId: string,
    @GetUser("id") userId: string,
  ) {
    return this.teamsService.remove(id, organizationId, userId);
  }
}
