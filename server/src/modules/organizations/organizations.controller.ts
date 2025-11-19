import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { SeatLimit } from "../../common/guards/seat-limit.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";
import { ProfilesService } from "../profiles/profiles.service";

import { SkipOrganizationMembership } from "./decorators/skip-organization-membership.decorator";
import { AcceptInvitationResponseDto } from "./dto/accept-invitation-response.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { BulkInviteUsersDto } from "./dto/bulk-invite-users.dto";
import { CancelInvitationResponseDto } from "./dto/cancel-invitation-response.dto";
import { CancelInvitationDto } from "./dto/cancel-invitation.dto";
import { CreateOrganizationsDto } from "./dto/create-organizations.dto";
import { InvitationResponseDto } from "./dto/invitation-response.dto";
import { InviteUserDto } from "./dto/invite-user.dto";
import { OnboardingDto } from "./dto/onboarding.dto";
import { OrganizationMemberResponseDto } from "./dto/organization-member-response.dto";
import { OrganizationResponseDto } from "./dto/organization-response.dto";
import { PendingInvitationResponseDto } from "./dto/pending-invitation-response.dto";
import { UpdateOrganizationsDto } from "./dto/update-organizations.dto";
import { UpdateUserTeamDto } from "./dto/update-user-team.dto";
import { OrganizationMembershipGuard } from "./guards/organization-membership.guard";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth("access-token")
@Controller("api/v1/organizations")
@UseGuards(JwtOrApiKeyAuthGuard, PermissionGuard, OrganizationMembershipGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly profilesService: ProfilesService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new organization" })
  @ApiResponse({
    status: 201,
    description: "The organization has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  create(
    @Body() createOrganizationsDto: CreateOrganizationsDto,
    @GetUser("sub") userId: string,
  ) {
    return this.organizationsService.create(createOrganizationsDto, userId);
  }

  @ApiTags("Organization Members")
  @Get("/my-invitations")
  @SkipOrganizationMembership()
  @ApiOperation({
    summary: "Get all pending invitations for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "List of pending invitations.",
    type: [InvitationResponseDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getMyInvitations(@GetUser("sub") userId: string) {
    const profile = await this.profilesService.getProfile(userId);
    if (!profile?.email) {
      throw new Error("User profile does not have an email address");
    }
    return this.organizationsService.getUserInvitations(profile.email);
  }

  @Post("onboarding")
  @SkipOrganizationMembership()
  @ApiOperation({ summary: "Complete organization onboarding" })
  @ApiResponse({
    status: 201,
    description: "The organization onboarding has been completed successfully.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  completeOnboarding(
    @Body() onboardingDto: OnboardingDto,
    @GetUser("sub") userId: string,
  ) {
    return this.organizationsService.completeOnboarding(onboardingDto, userId);
  }

  @Get()
  @SkipOrganizationMembership()
  @ApiOperation({ summary: "Get all organizations the user has access to" })
  @ApiResponse({
    status: 200,
    description: "Return all organizations the user has access to.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  findAll(@GetUser("sub") userId: string) {
    return this.organizationsService.getUserOrganizations(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get organization details by ID" })
  @ApiResponse({
    status: 200,
    description: "Return the organization details.",
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Access denied to organization." })
  findOne(@Param("id") id: string, @GetUser("sub") userId: string) {
    return this.organizationsService.findOneWithUserAccess(id, userId);
  }

  @Patch(":id")
  @RequirePermission("organization", "readWrite")
  @ApiOperation({ summary: "Update an organization" })
  @ApiResponse({
    status: 200,
    description: "The organization has been successfully updated.",
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Access denied to organization." })
  update(
    @Param("id") id: string,
    @Body() updateOrganizationsDto: UpdateOrganizationsDto,
    @GetUser("sub") userId: string,
  ) {
    return this.organizationsService.updateWithUserAccess(
      id,
      updateOrganizationsDto,
      userId,
    );
  }

  @Patch(":id/onboarding")
  @ApiOperation({ summary: "Update organization onboarding data" })
  @ApiResponse({
    status: 200,
    description:
      "The organization onboarding data has been successfully updated.",
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Access denied to organization." })
  updateOnboarding(
    @Param("id") id: string,
    @Body() onboardingDto: OnboardingDto,
    @GetUser("sub") userId: string,
  ) {
    return this.organizationsService.updateOnboardingWithUserAccess(
      id,
      onboardingDto,
      userId,
    );
  }

  @Patch(":id/api-token")
  @RequirePermission("organization", "readWrite")
  @ApiOperation({ summary: "Update organization API token" })
  @ApiResponse({
    status: 200,
    description: "The API token has been successfully updated.",
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Access denied to organization." })
  updateApiToken(@Param("id") id: string, @GetUser("sub") userId: string) {
    return this.organizationsService.updateApiTokenWithUserAccess(id, userId);
  }

  @ApiTags("Organization Members")
  @Delete("cancel-invitation")
  @RequirePermission("users", "readWrite")
  @ApiOperation({ summary: "Cancel an organization invitation" })
  @ApiResponse({
    status: 200,
    description: "The invitation has been cancelled successfully.",
    type: CancelInvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: "Invitation not found." })
  @ApiResponse({
    status: 409,
    description: "Invitation already accepted or expired.",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - no permission to cancel invitation.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async cancelInvitation(
    @Body() cancelInvitationDto: CancelInvitationDto,
    @Query("organization_id") organizationId: string,
    @GetUser("sub") userId: string,
    @Req() request: any,
  ) {
    // Add organization ID to the request for permission check
    request.query.organization_id = organizationId;

    return this.organizationsService.cancelInvitation(
      cancelInvitationDto.invitation_id,
      organizationId,
      userId,
    );
  }

  @Delete(":id")
  @RequirePermission("organization", "readWrite")
  @ApiOperation({ summary: "Delete an organization" })
  @ApiResponse({
    status: 200,
    description: "The organization has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Access denied to organization." })
  remove(@Param("id") id: string, @GetUser("sub") userId: string) {
    return this.organizationsService.removeWithUserAccess(id, userId);
  }

  @Delete(":id/users/:userId")
  @RequirePermission("users", "readWrite")
  @ApiOperation({
    summary: "Remove a user from an organization",
    description: "Removes a user from the specified organization.",
  })
  @ApiResponse({
    status: 200,
    description: "User has been successfully removed from the organization.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden." })
  @ApiResponse({ status: 404, description: "Not found." })
  removeUserFromOrganization(
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.organizationsService.removeUserFromOrganization(userId, id);
  }

  @Patch(":id/users/:userId/team")
  @RequirePermission("users", "readWrite")
  @ApiOperation({
    summary: "Update user team membership",
    description:
      "Updates a user's team within the organization. Organization owners cannot be moved from admin teams.",
  })
  @ApiResponse({
    status: 200,
    description: "User team has been successfully updated.",
  })
  @ApiResponse({ status: 400, description: "Bad request." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Owner cannot be moved from admin team.",
  })
  @ApiResponse({ status: 404, description: "Not found." })
  @ApiBody({ type: UpdateUserTeamDto })
  updateUserTeam(
    @Param("id") organizationId: string,
    @Param("userId") userId: string,
    @Body() body: UpdateUserTeamDto,
  ) {
    return this.organizationsService.updateUserTeam(
      userId,
      organizationId,
      body.team_id,
    );
  }

  @Get(":id/members")
  @ApiOperation({ summary: "Get all members of an organization" })
  @ApiResponse({
    status: 200,
    description: "Return all members of the organization.",
    type: [OrganizationMemberResponseDto],
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getOrganizationMembers(@Param("id") id: string) {
    return this.organizationsService.getOrganizationMembers(id);
  }

  @ApiTags("Organization Members")
  @Post(":organizationId/invite")
  @RequirePermission("users", "readWrite")
  @ApiOperation({ summary: "Invite a user to an organization" })
  @ApiResponse({
    status: 201,
    description: "User invited successfully",
  })
  @SeatLimit() // Add seat limit validation
  async inviteUser(
    @Param("organizationId") organizationId: string,
    @Body() inviteUserDto: InviteUserDto,
    @GetUser() user: { sub: string },
  ) {
    return this.organizationsService.inviteUser(organizationId, inviteUserDto);
  }

  @ApiTags("Organization Members")
  @Post(":organizationId/bulk-invite")
  @RequirePermission("users", "readWrite")
  @ApiOperation({ summary: "Bulk invite users to an organization" })
  @ApiResponse({
    status: 201,
    description: "Users invited successfully",
  })
  @ApiResponse({
    status: 500,
    description: "Server error during bulk invitation",
  })
  @SeatLimit() // Add seat limit validation for bulk invites
  async bulkInviteUsers(
    @Param("organizationId") organizationId: string,
    @Body() bulkInviteDto: BulkInviteUsersDto,
    @GetUser() user: { sub: string },
  ) {
    const result = await this.organizationsService.bulkInviteUsers(
      organizationId,
      bulkInviteDto,
    );

    // If there are any failures, return 500 status
    if (result.failed > 0) {
      throw new HttpException(
        {
          success: false,
          message: result.message,
          total_processed: result.total_processed,
          successful: result.successful,
          failed: result.failed,
          results: result.results,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // If all successful, return 201 status
    return {
      success: true,
      message: result.message,
      total_processed: result.total_processed,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    };
  }

  @ApiTags("Organization Members")
  @Get(":id/pending-invitations")
  @ApiOperation({ summary: "Get all pending invitations for the organization" })
  @ApiResponse({
    status: 200,
    description: "Returns all pending invitations.",
    type: [PendingInvitationResponseDto],
  })
  @ApiResponse({ status: 404, description: "Organization not found." })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  getPendingInvitations(@Param("id") organizationId: string) {
    return this.organizationsService.getPendingInvitations(organizationId);
  }

  @ApiTags("Organization Members")
  @Post("accept-invitation")
  @SkipOrganizationMembership()
  @ApiOperation({ summary: "Accept an organization invitation" })
  @ApiResponse({
    status: 200,
    description: "The invitation has been accepted successfully.",
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: "Invitation not found." })
  @ApiResponse({
    status: 409,
    description: "Invitation already accepted or expired.",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - email mismatch or already a member.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @GetUser("sub") userId: string,
    @GetUser("email") userEmail: string,
  ) {
    return this.organizationsService.acceptInvitation(
      acceptInvitationDto.invitation_id,
      userId,
      userEmail,
    );
  }
}
