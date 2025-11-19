import { randomUUID } from "crypto";

import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { createClient } from "@supabase/supabase-js";
import { Repository } from "typeorm";

import { Calendars } from "../calendar/entities/calendars.entity";
import { EmailService } from "../email/email.service";
import { MeetingType } from "../meeting_types/entities/meeting_types.entity";
import { PermissionsService } from "../permissions/permissions.service";
import { ProfilesService } from "../profiles/profiles.service";
import { Teams } from "../teams/entities/teams.entity";
import { TeamsService } from "../teams/teams.service";

import { BulkInviteUsersDto } from "./dto/bulk-invite-users.dto";
import { CreateOrganizationsDto } from "./dto/create-organizations.dto";
import { InviteUserDto } from "./dto/invite-user.dto";
import { OnboardingDto } from "./dto/onboarding.dto";
import { UpdateOrganizationsDto } from "./dto/update-organizations.dto";
import { OrganizationInvite } from "./entities/organization-invite.entity";
import { Organizations } from "./entities/organizations.entity";
import { UserOrganization } from "./entities/user-organization.entity";

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);
  private supabase;

  constructor(
    @InjectRepository(Organizations)
    private organizationsRepository: Repository<Organizations>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(OrganizationInvite)
    private organizationInviteRepository: Repository<OrganizationInvite>,
    @InjectRepository(Teams)
    private teamsRepository: Repository<Teams>,
    @InjectRepository(MeetingType)
    private meetingTypeRepository: Repository<MeetingType>,
    @InjectRepository(Calendars)
    private calendarsRepository: Repository<Calendars>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    @Inject(forwardRef(() => ProfilesService))
    private profilesService: ProfilesService,
    @Inject(forwardRef(() => PermissionsService))
    private permissionsService: PermissionsService,
    @Inject(EmailService)
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY, // Use service key for admin operations
    );
  }

  async create(createOrganizationsDto: CreateOrganizationsDto, userId: string) {
    const organization = this.organizationsRepository.create({
      ...createOrganizationsDto,
      owner_id: userId,
    });
    const savedOrg = await this.organizationsRepository.save(organization);

    // Create admin team directly without validation since this is the initial setup
    const adminTeam = await this.teamsRepository.save({
      name: "Admin",
      description: "Administrator team",
      organization_id: savedOrg.id,
      is_admin: true,
    });

    // Admin teams have wild card access - no need to set specific permissions
    // await this.permissionsService.bulkSetTeamPermissions(...)

    // Create initial user-organization relationship for the owner with the admin team
    await this.userOrganizationRepository.save({
      user_id: userId,
      organization_id: savedOrg.id,
      team_id: adminTeam.id,
    });

    // Create default meeting types
    await this.createDefaultMeetingTypes(savedOrg.id);

    return savedOrg;
  }

  async completeOnboarding(onboardingDto: OnboardingDto, userId: string) {
    const organization = this.organizationsRepository.create({
      ...onboardingDto,
      owner_id: userId,
    });
    const savedOrg = await this.organizationsRepository.save(organization);

    // Create admin team directly without validation since this is the initial setup
    const adminTeam = await this.teamsRepository.save({
      name: "Admin",
      description: "Administrator team",
      organization_id: savedOrg.id,
      is_admin: true,
    });

    // Set full read/write permissions for the admin team
    await this.permissionsService.bulkSetTeamPermissions(
      savedOrg.id,
      adminTeam.id,
      [
        { resource_type: "reports", access_level: "readWrite" },
        { resource_type: "teams", access_level: "readWrite" },
        { resource_type: "report_types", access_level: "readWrite" },
        { resource_type: "meeting_types", access_level: "readWrite" },
        { resource_type: "permissions", access_level: "readWrite" },
      ],
    );

    // Create initial user-organization relationship for the owner with the admin team
    await this.userOrganizationRepository.save({
      user_id: userId,
      organization_id: savedOrg.id,
      team_id: adminTeam.id,
    });

    // Create default meeting types
    await this.createDefaultMeetingTypes(savedOrg.id);

    return savedOrg;
  }

  async findAll(query: Partial<Organizations> = {}) {
    return await this.organizationsRepository.find({
      where: query,
      select: ["id", "name"],
    });
  }

  async findOne(id: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return organization;
  }

  async findOneWithUserAccess(id: string, userId: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      select: [
        "id",
        "name",
        "website",
        "company_analysis",
        "company_type",
        "team_size",
        "business_description",
        "business_offering",
        "industry",
        "target_audience",
        "channels",
      ],
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Check if user has access to this organization
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { user_id: userId, organization_id: id },
    });
    if (!userOrg) {
      throw new NotFoundException(
        `Access denied to organization with ID ${id}`,
      );
    }

    return organization;
  }

  async update(id: string, updateOrganizationsDto: UpdateOrganizationsDto) {
    const organization = await this.findOne(id);
    Object.assign(organization, updateOrganizationsDto);
    return await this.organizationsRepository.save(organization);
  }

  async updateWithUserAccess(
    id: string,
    updateOrganizationsDto: UpdateOrganizationsDto,
    userId: string,
  ) {
    const organization = await this.findOneWithUserAccess(id, userId);
    Object.assign(organization, updateOrganizationsDto);
    return await this.organizationsRepository.save(organization);
  }

  async updateOnboardingWithUserAccess(
    id: string,
    onboardingDto: OnboardingDto,
    userId: string,
  ) {
    const organization = await this.findOneWithUserAccess(id, userId);
    Object.assign(organization, onboardingDto);
    return await this.organizationsRepository.save(organization);
  }

  async remove(id: string) {
    const organization = await this.findOne(id);

    // Get all user-organization relationships for this organization
    const userOrgs = await this.userOrganizationRepository.find({
      where: { organization_id: id },
    });

    // Clean up calendars for each user in the organization
    for (const userOrg of userOrgs) {
      await this.cleanupUserCalendars(userOrg.user_id, id);
    }

    // Remove all user-organization relationships
    await this.userOrganizationRepository.delete({ organization_id: id });
    await this.organizationsRepository.remove(organization);
    return { deleted: true };
  }

  async removeWithUserAccess(id: string, userId: string) {
    const organization = await this.findOneWithUserAccess(id, userId);

    // Get all user-organization relationships for this organization
    const userOrgs = await this.userOrganizationRepository.find({
      where: { organization_id: id },
    });

    // Clean up calendars for each user in the organization
    for (const userOrg of userOrgs) {
      await this.cleanupUserCalendars(userOrg.user_id, id);
    }

    // Remove all user-organization relationships
    await this.userOrganizationRepository.delete({ organization_id: id });
    await this.organizationsRepository.remove(organization);
    return { deleted: true };
  }

  async updateApiToken(id: string) {
    const organization = await this.findOne(id);
    const apiToken = randomUUID();
    organization.api_token = apiToken;
    await this.organizationsRepository.save(organization);
    return { token: apiToken };
  }

  async updateApiTokenWithUserAccess(id: string, userId: string) {
    const organization = await this.findOneWithUserAccess(id, userId);
    const apiToken = randomUUID();
    organization.api_token = apiToken;
    await this.organizationsRepository.save(organization);
    return { token: apiToken };
  }

  // New methods for user-organization management
  async addUserToOrganization(userId: string, organizationId: string) {
    await this.findOne(organizationId); // Verify organization exists
    const userOrg = this.userOrganizationRepository.create({
      user_id: userId,
      organization_id: organizationId,
    });
    return await this.userOrganizationRepository.save(userOrg);
  }

  async removeUserFromOrganization(userId: string, organizationId: string) {
    // Clean up calendars for this user in this organization
    await this.cleanupUserCalendars(userId, organizationId);

    const result = await this.userOrganizationRepository.delete({
      user_id: userId,
      organization_id: organizationId,
    });
    return { deleted: result.affected > 0 };
  }

  async getUserOrganizations(userId: string) {
    const userOrgs = await this.userOrganizationRepository.find({
      where: { user_id: userId },
      relations: ["organization"],
    });

    return userOrgs.map((userOrg) => ({
      id: userOrg.organization.id,
      name: userOrg.organization.name,
    }));
  }

  async getUserOrganizationWithTeam(
    userId: string,
    organizationId: string,
  ) {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { user_id: userId, organization_id: organizationId },
      relations: ["team"],
    });

    return userOrg;
  }

  async updateUserRole(userId: string, organizationId: string) {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { user_id: userId, organization_id: organizationId },
    });
    if (!userOrg) {
      throw new NotFoundException("User-organization relationship not found");
    }

    return await this.userOrganizationRepository.save(userOrg);
  }

  /**
   * Updates a user's team membership within an organization
   * Includes validation that organization owners cannot be moved from admin teams
   */
  async updateUserTeam(
    userId: string,
    organizationId: string,
    newTeamId: string,
  ) {
    // Validate that the new team exists and belongs to the organization
    const newTeam = await this.teamsRepository.findOne({
      where: { id: newTeamId, organization_id: organizationId },
    });
    if (!newTeam) {
      throw new NotFoundException("Team not found in this organization");
    }

    // Get current user organization relationship
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { user_id: userId, organization_id: organizationId },
      relations: ["team"],
    });
    if (!userOrg) {
      throw new NotFoundException("User not found in this organization");
    }

    // Check if user is the organization owner
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      select: ["owner_id"],
    });

    if (organization?.owner_id === userId) {
      // Owner cannot be moved from admin team
      if (!newTeam.is_admin) {
        throw new ForbiddenException(
          "Organization owner must remain in admin team",
        );
      }
    }

    // Update user's team
    await this.userOrganizationRepository.update(
      { id: userOrg.id },
      { team_id: newTeamId },
    );

    // Return the updated user organization
    const updatedUserOrg = await this.userOrganizationRepository.findOne({
      where: { id: userOrg.id },
      relations: ["team"],
    });

    return updatedUserOrg;
  }

  async getOrganizationMembers(organizationId: string) {
    const members = await this.userOrganizationRepository.find({
      where: { organization_id: organizationId },
      relations: ["user", "team"],
    });
    return members.map((member) => ({
      id: member.user_id,
      first_name: member.user.first_name,
      last_name: member.user.last_name,
      email: member.user.email,
      team: member.team.name,
    }));
  }

  async inviteUser(organizationId: string, inviteData: InviteUserDto) {
    // Verify organization exists
    const organization = await this.findOne(organizationId);

    // Check if there's already a pending invite
    const existingInvite = await this.organizationInviteRepository.findOne({
      where: {
        organization_id: organizationId,
        email: inviteData.email,
        is_accepted: false,
      },
    });

    if (existingInvite) {
      throw new ConflictException(
        "User already has a pending invitation to this organization",
      );
    }

    // Set expiration time to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create organization invite
    const invite = this.organizationInviteRepository.create({
      organization_id: organizationId,
      email: inviteData.email,
      team_id: inviteData.team_id,
      expires_at: expiresAt,
      is_accepted: false,
    });

    await this.organizationInviteRepository.save(invite);

    try {
      // Check if the user already exists in the profile table
      const existingProfile = await this.profilesService.getProfileByEmail(
        inviteData.email,
      );

      if (existingProfile) {
        // User exists in profile table, send invitation email using our email service
        try {
          // Get team name for the email
          const team = inviteData.team_id
            ? await this.teamsRepository.findOne({
                where: { id: inviteData.team_id },
                select: ["name"],
              })
            : null;

          await this.emailService.sendOrganizationInvitation(
            inviteData.email,
            "there",
            organization.name,
            invite.id,
            team?.name,
          );

          this.logger.log(
            `Organization invitation email sent successfully to existing user ${inviteData.email} for organization ${organization.name}`,
          );

          return {
            message: "Invitation sent successfully to existing user.",
            invite,
          };
        } catch (emailError) {
          // If email sending fails, delete the invite
          await this.organizationInviteRepository.remove(invite);
          throw new ConflictException(
            `Failed to send invitation email: ${emailError.message || "Unknown error occurred"}`,
          );
        }
      } else {
        // User doesn't exist in profile table, send invitation email using our email service
        try {
          // Get team name for the email
          const team = inviteData.team_id
            ? await this.teamsRepository.findOne({
                where: { id: inviteData.team_id },
                select: ["name"],
              })
            : null;

          await this.emailService.sendOrganizationInvitation(
            inviteData.email,
            "there",
            organization.name,
            invite.id,
            team?.name,
          );

          this.logger.log(
            `Organization invitation email sent successfully to new user ${inviteData.email} for organization ${organization.name}`,
          );

          return {
            message: "Invitation sent successfully",
            invite,
          };
        } catch (emailError) {
          // If email sending fails, delete the invite
          await this.organizationInviteRepository.remove(invite);
          throw new ConflictException(
            `Failed to send invitation email: ${emailError.message || "Unknown error occurred"}`,
          );
        }
      }
    } catch (error) {
      // If any error occurs, clean up the invite
      await this.organizationInviteRepository.remove(invite);
      throw new ConflictException(
        `Failed to process invitation: ${error.message || "Unknown error occurred"}`,
      );
    }
  }

  async bulkInviteUsers(
    organizationId: string,
    bulkInviteData: BulkInviteUsersDto,
  ) {
    // Verify organization exists
    const organization = await this.findOne(organizationId);

    // Process all invitations in parallel
    const invitationPromises = bulkInviteData.users.map(async (userData) => {
      try {
        // Check if there's already a pending invite for this user
        const existingInvite = await this.organizationInviteRepository.findOne({
          where: {
            organization_id: organizationId,
            email: userData.email,
            is_accepted: false,
          },
        });

        if (existingInvite) {
          return {
            email: userData.email,
            success: false,
            error: "User already has a pending invitation to this organization",
          };
        }

        // Set expiration time to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create organization invite
        const invite = this.organizationInviteRepository.create({
          organization_id: organizationId,
          email: userData.email,
          team_id: userData.team_id,
          expires_at: expiresAt,
          is_accepted: false,
        });

        await this.organizationInviteRepository.save(invite);

        // Check if the user already exists in the profile table
        const existingProfile = await this.profilesService.getProfileByEmail(
          userData.email,
        );

        if (existingProfile) {
          // User exists in profile table, send invitation email using our email service
          try {
            // Get team name for the email
            const team = userData.team_id
              ? await this.teamsRepository.findOne({
                  where: { id: userData.team_id },
                  select: ["name"],
                })
              : null;

            await this.emailService.sendOrganizationInvitation(
              userData.email,
              "there",
              organization.name,
              invite.id,
              team?.name,
            );

            this.logger.log(
              `Organization invitation email sent successfully to existing user ${userData.email} for organization ${organization.name}`,
            );

            return {
              email: userData.email,
              success: true,
              invitation_id: invite.id,
            };
          } catch (emailError) {
            // Log the email error to trigger email notification
            this.logger.error(
              `Email sending error during bulk invitation for ${userData.email}: ${emailError.message || "Unknown error occurred"}`,
              emailError.stack || emailError.toString(),
              "OrganizationsService",
            );

            // If email sending fails, delete the invite
            await this.organizationInviteRepository.remove(invite);
            return {
              email: userData.email,
              success: false,
              error: `Failed to send invitation email: ${emailError.message || "Unknown error occurred"}`,
            };
          }
        } else {
          // User doesn't exist in profile table, send invitation email using our email service
          try {
            // Get team name for the email
            const team = userData.team_id
              ? await this.teamsRepository.findOne({
                  where: { id: userData.team_id },
                  select: ["name"],
                })
              : null;

            await this.emailService.sendOrganizationInvitation(
              userData.email,
              "there",
              organization.name,
              invite.id,
              team?.name,
            );

            this.logger.log(
              `Organization invitation email sent successfully to new user ${userData.email} for organization ${organization.name}`,
            );

            return {
              email: userData.email,
              success: true,
              invitation_id: invite.id,
            };
          } catch (emailError) {
            // Log the email error to trigger email notification
            this.logger.error(
              `Email sending error during bulk invitation for ${userData.email}: ${emailError.message || "Unknown error occurred"}`,
              emailError.stack || emailError.toString(),
              "OrganizationsService",
            );

            // If email sending fails, delete the invite
            await this.organizationInviteRepository.remove(invite);
            return {
              email: userData.email,
              success: false,
              error: `Failed to send invitation email: ${emailError.message || "Unknown error occurred"}`,
            };
          }
        }
      } catch (error) {
        // Log the error to trigger email notification
        this.logger.error(
          `Failed to process bulk invitation for ${userData.email}: ${error.message || "Unknown error occurred"}`,
          error.stack || error.toString(),
          "OrganizationsService",
        );

        return {
          email: userData.email,
          success: false,
          error: `Failed to process invitation: ${error.message || "Unknown error occurred"}`,
        };
      }
    });

    // Wait for all invitations to complete
    const results = await Promise.all(invitationPromises);

    // Calculate statistics
    const successful = results.filter((result) => result.success).length;
    const failed = results.filter((result) => !result.success).length;

    this.logger.log(
      `Bulk invitation completed for organization ${organization.name}: ${successful} successful, ${failed} failed`,
    );

    return {
      message: "Bulk invitation completed",
      total_processed: bulkInviteData.users.length,
      successful,
      failed,
      results,
    };
  }

  async getPendingInvitations(organizationId: string) {
    const pendingInvitations = await this.organizationInviteRepository.find({
      where: {
        organization_id: organizationId,
        is_accepted: false,
      },
      relations: ["team"],
    });

    // Filter out expired invitations
    const now = new Date();
    const validInvitations = pendingInvitations.filter(
      (invitation) => !invitation.expires_at || invitation.expires_at > now,
    );

    // Transform the response to include team name
    return validInvitations.map((invitation) => ({
      id: invitation.id,
      organization_id: invitation.organization_id,
      team_id: invitation.team_id,
      team_name: invitation.team?.name || "Unknown Team",
      email: invitation.email,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
      is_accepted: invitation.is_accepted,
      accepted_by_user_id: invitation.accepted_by_user_id,
    }));
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string,
  ) {
    // Find the invitation
    const invitation = await this.organizationInviteRepository.findOne({
      where: { id: invitationId },
      relations: ["organization", "team"],
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    // Check if invitation is already accepted
    if (invitation.is_accepted) {
      throw new ConflictException("Invitation has already been accepted");
    }

    // Check if invitation has expired
    if (invitation.expires_at && invitation.expires_at < new Date()) {
      throw new ConflictException("Invitation has expired");
    }

    // Verify that the user's email matches the invitation email
    if (invitation.email !== userEmail) {
      throw new ForbiddenException(
        "You can only accept invitations sent to your email address",
      );
    }

    // Check if user is already a member of this organization
    const existingMembership = await this.userOrganizationRepository.findOne({
      where: {
        user_id: userId,
        organization_id: invitation.organization_id,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        "You are already a member of this organization",
      );
    }

    // Mark invitation as accepted
    await this.organizationInviteRepository.update(
      { id: invitationId },
      {
        is_accepted: true,
        accepted_by_user_id: userId,
      },
    );

    // Add user to organization
    const userOrganization = this.userOrganizationRepository.create({
      user_id: userId,
      organization_id: invitation.organization_id,
      team_id: invitation.team_id,
    });

    await this.userOrganizationRepository.save(userOrganization);

    this.logger.log(
      `User ${userId} successfully accepted invitation ${invitationId} for organization ${invitation.organization_id}`,
    );

    return {
      message: "Invitation accepted successfully",
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
      },
    };
  }

  async getInvitationById(invitationId: string) {
    return this.organizationInviteRepository.findOne({
      where: { id: invitationId },
      relations: ["organization"],
    });
  }

  async cancelInvitation(
    invitationId: string,
    organizationId: string,
    userId: string,
  ) {
    // Find the invitation and verify it belongs to the specified organization
    const invitation = await this.organizationInviteRepository.findOne({
      where: {
        id: invitationId,
        organization_id: organizationId,
      },
      relations: ["organization"],
    });

    if (!invitation) {
      throw new NotFoundException(
        "Invitation not found or does not belong to the specified organization",
      );
    }

    // Check if invitation is already accepted
    if (invitation.is_accepted) {
      throw new ConflictException(
        "Cannot cancel an already accepted invitation",
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at && invitation.expires_at < new Date()) {
      throw new ConflictException("Cannot cancel an expired invitation");
    }

    // Delete the invitation
    await this.organizationInviteRepository.remove(invitation);

    this.logger.log(
      `User ${userId} successfully cancelled invitation ${invitationId} for organization ${organizationId}`,
    );

    return {
      message: "Invitation cancelled successfully",
      invitation_id: invitationId,
      organization_id: organizationId,
    };
  }

  async getUserInvitations(userEmail: string) {
    const pendingInvitations = await this.organizationInviteRepository.find({
      where: {
        email: userEmail,
        is_accepted: false,
      },
      relations: ["organization", "team"],
    });

    // Filter out expired invitations
    const now = new Date();
    const validInvitations = pendingInvitations.filter(
      (invitation) => !invitation.expires_at || invitation.expires_at > now,
    );

    // Transform the response to include organization and team details
    return validInvitations.map((invitation) => ({
      id: invitation.id,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
      },
      email: invitation.email,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
      // Add missing fields with sensible defaults
      role: "Member", // Default role for invited users
      status: "pending", // Default status for pending invitations
      invited_by: undefined, // Not available in current schema
    }));
  }

  async createDefaultMeetingTypes(organizationId: string): Promise<void> {
    const defaultMeetingTypes = [
      {
        name: "Onboarding",
        description:
          "Teaching customers how to use a product or specific features within it. Guiding customers through the setup and installation processes. Helping users establish integrations with other software or systems. Explaining how to set up billing or payment processes within Grayza. Providing training or walkthroughs specific to hospitality venue use-cases.",
        analysis_metadata_structure: {
          Timeline:
            "The timeframe or schedule for each step (e.g., expected completion dates).",
          Milestones:
            "Key checkpoints or markers that indicate progress (e.g., 'Completion of initial training,' 'Successful pilot test').",
          Objectives:
            "Specific outcomes or goals the onboarding process aims to achieve (e.g., successful product implementation, integration with existing systems).",
          "Key Insights":
            "Notable observations gleaned from the call (e.g., 'Customer's top priority is user training,' 'They lack a dedicated IT resource').",
          "Open Questions":
            "Unresolved inquiries or clarifications needed (e.g., 'Need confirm on user permission levels').",
          "Training Topics":
            "Specific areas or modules where the customer needs training (e.g., 'Reporting dashboard,' 'User management').",
          "Additional Notes":
            "Any extra details that do not fit other fields but are relevant to the onboarding process or context.",
          "Questions Raised":
            "Any questions the customer asked during the onboarding call.",
          "Resources Needed":
            "Tools, documentation, or personnel required for a successful onboarding (e.g., 'Admin access,' 'Integration guide').",
          "Success Criteria":
            "Measurable indicators that onboarding is successful (e.g., 'All users can log in,' 'System integrated with CRM').",
          "Customer Feedback":
            "Any positive or constructive comments from the customer regarding the onboarding process, product, or support received.",
          "Follow-Up Actions":
            "Additional tasks or steps to be taken after the call (e.g., 'Send setup documentation,' 'Schedule next training session').",
          "Customer Readiness":
            "Whether the customer has the resources, knowledge, and buy-in to move forward (e.g., 'Ready to implement,' 'Needs more approvals').",
          "Integration Points":
            "Systems or third-party tools that will connect with the product (e.g., 'Salesforce,' 'Slack integrations').",
          "Potential Blockers":
            "Risks, dependencies, or issues that might delay onboarding (e.g., 'Waiting on server access,' 'Lack of internal approvals').",
          "Customer Background":
            "High-level context about the customer's industry, relevant history, or any details that inform how onboarding is tailored.",
          "Follow-Up Deadlines":
            "Expected due dates or timeframes for all follow-up tasks (e.g., 'October 15, 2025,' 'Within 2 business days').",
          "Scope of Onboarding":
            "The products, features, or services to be set up or taught during the onboarding.",
          "Implementation Steps":
            "Step-by-step actions planned to implement or configure the product/service (e.g., 'Install software,' 'Configure user permissions').",
          "Next Scheduled Event":
            "The next planned call, meeting, or milestone (e.g., 'Demo session in 1 week,' 'Project check-in on [date]').",
          "Onboarding Call Purpose":
            "The primary goal or reason for the call (e.g., initial setup, product walkthrough, training session).",
          "Customer Enthusiasm Level":
            "The perceived interest or excitement level from the customer (e.g., 'Highly engaged,' 'Cautiously optimistic,' 'Resistant').",
          "Risk Mitigation Strategies":
            "Plans to address or minimize any potential blockers (e.g., 'Escalate to IT manager,' 'Provide temporary credentials').",
          "Roles and Responsibilities":
            "Who is responsible for each task in the onboarding process (e.g., 'Client IT handles installation,' 'Your Team configures system settings').",
          "Answers or Guidance Provided":
            "How those questions were addressed or responded to.",
          "Customer's Existing Processes":
            "Overview of how the customer currently operates (e.g., existing software, workflows) and how it might affect onboarding.",
          "Responsible Parties for Follow-Up":
            "Individuals or teams assigned to handle each follow-up action.",
        },
      },
      {
        name: "Business",
        description:
          "Internal meetings discussing strategy, development plans, and roadmap. Conversations about current customers, their needs, or their feature requests. Calls with partners or third-party companies about integrations, partnerships, or collaborations. Discussions around expansion strategies, market research, or competitive analysis. Meetings related to business processes, revenue, or financial planning.",
        analysis_metadata_structure: {
          Objectives:
            "List the main objectives or goals discussed during the meeting, detailing specific tasks or aims.",
          "Action Items":
            "Clearly list actionable items agreed upon during the meeting.",
          Opportunities:
            "Highlight mentioned opportunities and their potential impacts on the business.",
          "Decisions Made":
            "Summarize key decisions, including the rationale behind them and planned next steps.",
          "Meeting Purpose":
            "Clearly summarize the primary purpose and outcomes of the meeting, such as addressing specific issues, creating solutions, or developing strategies.",
          "Progress Report":
            "Provide summarized updates or progress mentioned on any initiatives or previously discussed actions.",
          "Strategic Plans":
            "Summarize discussed short-term and long-term strategic plans and their alignment with business goals.",
          "Project Overview":
            "Summarize any projects mentioned, including their scope, timelines, and current statuses.",
          "Financial Updates":
            "Summarize financial performance insights, growth trends, and key financial focus areas (exclude specific numerical data).",
          "High-Level Overview":
            "Provide a concise overview summarizing the general context of the call, including what was discussed, the meeting's purpose, and the end result.",
          "Risks and Challenges":
            "List identified risks or challenges, potential impacts, and any mentioned mitigation strategies.",
          "Key Discussion Points":
            "Bullet point the primary discussion topics from the meeting.",
          "Stakeholder Feedback (Staff)":
            "Summarize feedback specifically from internal staff.",
          "Stakeholder Feedback (Investors)":
            "Summarize feedback specifically from investors.",
          "Stakeholder Feedback (Shareholders)":
            "Summarize any feedback specifically provided by shareholders.",
          "Stakeholder Feedback (Business Partners)":
            "Summarize feedback specifically from business partners.",
        },
      },
      {
        name: "Support",
        description:
          "Troubleshooting technical issues or bugs. Identifying and resolving errors in the software. Discussing operational issues, delays, or unexpected problems. Communicating timelines for product fixes or updates. Addressing immediate user concerns or complaints.",
        analysis_metadata_structure: {
          FAQs: "Explicit frequently asked questions mentioned.",
          "Due Date":
            "Explicitly stated timeline or deadline for the follow-up task.",
          "Use Case":
            "Clearly defined scenario explicitly stated by the customer regarding their use of Grayza.",
          "Action Task":
            "Clearly defined follow-up action explicitly agreed upon during the call.",
          "KPI Metrics": "Explicit KPIs stated as important.",
          "Key Takeaways":
            "Summarize the main technical insights, outcomes, or critical operational insights explicitly drawn from the call.",
          "Follow-Up Task": "Explicit additional follow-up actions required.",
          "Status Updates": "Explicit status or resolution progress updates.",
          "Tracking Tools": "Explicit tracking tools suggested.",
          "Training Needs":
            "Explicit training needs identified by the customer.",
          "What They Love":
            "Explicit Grayza features positively highlighted by the customer.",
          "Agent Strengths":
            "Explicit positive qualities or actions demonstrated by the agent.",
          "Competitor Name":
            "Explicitly stated name of any competitor mentioned during the call.",
          "Resolution Step": "Explicit actions taken to resolve issues.",
          "Discovery Method":
            "Explicitly stated method by which the customer discovered Grayza.",
          "Issues Addressed":
            "List explicitly mentioned technical or operational issues the customer faced.",
          "Project Overview":
            "Explicit summary of projects, including scope, timeline, or status if mentioned.",
          "Challenges Solved":
            "Explicitly mentioned challenges successfully resolved or addressed with Grayza.",
          "Customer Progress":
            "Explicit progress updates or growth indicators.",
          "Positive Feedback":
            "Clearly stated positive remarks or praise explicitly from the customer regarding Grayza's product or support.",
          "Responsible Party":
            "Explicitly mentioned individual or team responsible for executing the follow-up action.",
          "Success Milestone":
            "Explicit significant achievement or checkpoint mentioned.",
          "Competitor Context":
            "Explicit context explaining why the competitor was mentioned.",
          "Follow-Up Timeline": "Explicit timeline for follow-up actions.",
          "Competitor Insights":
            "Explicit insights about competitors explicitly mentioned by the customer.",
          "Customer Engagement":
            "Explicit indicators of active customer involvement.",
          "Customer Soundbites":
            "Direct memorable quotes explicitly stated by the customer.",
          "Expected Completion":
            "Explicitly stated expected resolution timeline.",
          "Follow-Up Resources": "Explicit resources for follow-up.",
          "Future Requirements": "Explicit future feature requests.",
          "Success Measurement":
            "Explicit metric or method for measuring success.",
          "Customer Touchpoints":
            "Explicitly mentioned interactions influencing the customer journey.",
          "Resolutions Provided":
            "Clearly detail technical solutions, instructions, or explanations explicitly provided to resolve issues.",
          "Unsatisfied Instance":
            "Explicit customer dissatisfaction expressed.",
          "Constructive Feedback":
            "Explicit areas for technical or operational improvement mentioned by the customer.",
          "Customer Satisfaction":
            "Explicit overall customer sentiment (Very satisfied, Neutral, Dissatisfied).",
          "Key Customer Concerns":
            "Clearly outlined main concerns explicitly stated by the customer.",
          "Key Discussion Topics":
            "Explicit list of main topics or themes covered.",
          "Resources Recommended":
            "Explicit recommended resources or materials.",
          "Satisfaction Evidence":
            "Explicit examples supporting the satisfaction rating.",
          "Scalability Solutions": "Explicit scalability solutions suggested.",
          "Additional Information": "Explicit additional relevant details.",
          "Resolution Steps Taken":
            "Explicitly stated chronological list of resolution steps.",
          "Agent Improvement Areas": "Explicit areas for agent improvement.",
          "Key Discussion Outcomes":
            "Explicit decisions or conclusions reached during the call.",
          "Customer Concern Priority":
            "Explicitly stated priority level (High, Medium, Low) for customer concerns.",
          "Customer Growth Potential":
            "Explicit growth or upselling opportunities.",
          "Training Topics Discussed":
            "Explicit technical or operational training topics discussed during the call.",
          "Consulting Call Objectives":
            "Clearly stated goals explicitly outlined for the support call.",
          "Customer Satisfaction Score":
            "Explicit numerical rating or general sentiment provided.",
          "Task Execution Instructions":
            "Explicit instructions or explanations on how to perform specific tasks with Grayza's system.",
          "Knowledge Base Documentation":
            "Explicit details for internal knowledge bases.",
          "Solution Impact on Retention":
            "Explicitly expected impact on customer retention.",
          "Technical Features Mentioned":
            "Explicit Grayza-specific technical features discussed during the call.",
          "Technical Solutions Provided":
            "Explicit technical solutions or troubleshooting steps clearly described.",
          "Low Severity Churn Indicators":
            "Explicit minor issues affecting potential long-term retention.",
          "Preferred Communication Style":
            "Explicitly stated preferred method of customer communication.",
          "Solution Impact on Engagement":
            "Explicitly expected impact on customer engagement.",
          "High Severity Churn Indicators":
            "Explicit severe issues stated indicating high risk of customer churn.",
          "Solution Impact on Satisfaction":
            "Explicitly expected impact on customer satisfaction.",
          "Medium Severity Churn Indicators":
            "Explicit moderate concerns stated potentially leading to churn if unresolved.",
          "Unsatisfied Instance Description":
            "Explicitly detailed reason for dissatisfaction.",
        },
      },
      {
        name: "Sales",
        description:
          "Discussing or explaining features or capabilities. Talking about pricing, plans, quotes, or proposals. Conducting demos or presentations to potential customers. Handling inquiries from prospective customers regarding product functionality. Addressing feature requests from potential customers to help close a deal.",
        analysis_metadata_structure: {
          Timeline:
            "The timeframe or schedule for each step (e.g., expected completion dates).",
          Milestones:
            "Key checkpoints or markers that indicate progress (e.g., 'Completion of initial training,' 'Successful pilot test').",
          Objectives:
            "Specific outcomes or goals the onboarding process aims to achieve (e.g., successful product implementation, integration with existing systems).",
          "Key Insights":
            "Notable observations gleaned from the call (e.g., 'Customer's top priority is user training,' 'They lack a dedicated IT resource').",
          "Open Questions":
            "Unresolved inquiries or clarifications needed (e.g., 'Need confirm on user permission levels').",
          "Training Topics":
            "Specific areas or modules where the customer needs training (e.g., 'Reporting dashboard,' 'User management').",
          "Additional Notes":
            "Any extra details that do not fit other fields but are relevant to the onboarding process or context.",
          "Questions Raised":
            "Any questions the customer asked during the onboarding call.",
          "Resources Needed":
            "Tools, documentation, or personnel required for a successful onboarding (e.g., 'Admin access,' 'Integration guide').",
          "Success Criteria":
            "Measurable indicators that onboarding is successful (e.g., 'All users can log in,' 'System integrated with CRM').",
          "Customer Feedback":
            "Any positive or constructive comments from the customer regarding the onboarding process, product, or support received.",
          "Follow-Up Actions":
            "Additional tasks or steps to be taken after the call (e.g., 'Send setup documentation,' 'Schedule next training session').",
          "Customer Readiness":
            "Whether the customer has the resources, knowledge, and buy-in to move forward (e.g., 'Ready to implement,' 'Needs more approvals').",
          "Integration Points":
            "Systems or third-party tools that will connect with the product (e.g., 'Salesforce,' 'Slack integrations').",
          "Potential Blockers":
            "Risks, dependencies, or issues that might delay onboarding (e.g., 'Waiting on server access,' 'Lack of internal approvals').",
          "Customer Background":
            "High-level context about the customer's industry, relevant history, or any details that inform how onboarding is tailored.",
          "Follow-Up Deadlines":
            "Expected due dates or timeframes for all follow-up tasks (e.g., 'October 15, 2025,' 'Within 2 business days').",
          "Scope of Onboarding":
            "The products, features, or services to be set up or taught during the onboarding.",
          "Implementation Steps":
            "Step-by-step actions planned to implement or configure the product/service (e.g., 'Install software,' 'Configure user permissions').",
          "Next Scheduled Event":
            "The next planned call, meeting, or milestone (e.g., 'Demo session in 1 week,' 'Project check-in on [date]').",
          "Onboarding Call Purpose":
            "The primary goal or reason for the call (e.g., initial setup, product walkthrough, training session).",
          "Customer Enthusiasm Level":
            "The perceived interest or excitement level from the customer (e.g., 'Highly engaged,' 'Cautiously optimistic,' 'Resistant').",
          "Risk Mitigation Strategies":
            "Plans to address or minimize any potential blockers (e.g., 'Escalate to IT manager,' 'Provide temporary credentials').",
          "Roles and Responsibilities":
            "Who is responsible for each task in the onboarding process (e.g., 'Client IT handles installation,' 'Your Team configures system settings').",
          "Answers or Guidance Provided":
            "How those questions were addressed or responded to.",
          "Customer's Existing Processes":
            "Overview of how the customer currently operates (e.g., existing software, workflows) and how it might affect onboarding.",
          "Responsible Parties for Follow-Up":
            "Individuals or teams assigned to handle each follow-up action.",
        },
      },
    ];

    // Get admin teams to assign permissions
    const adminTeams = await this.teamsService.getAdminTeams(organizationId);

    // Create all default meeting types for the organization
    for (const meetingTypeData of defaultMeetingTypes) {
      const meetingType = this.meetingTypeRepository.create({
        name: meetingTypeData.name,
        description: meetingTypeData.description,
        analysis_metadata_structure:
          meetingTypeData.analysis_metadata_structure,
        organization_id: organizationId,
      });

      const savedMeetingType =
        await this.meetingTypeRepository.save(meetingType);

      // Assign read/write permissions to admin teams for this default meeting type
      await Promise.all(
        adminTeams.map((adminTeam) =>
          this.permissionsService.create({
            resource_type: "meeting_types",
            resource_id: savedMeetingType.id,
            access_level: "readWrite",
            team_id: adminTeam.id,
          }),
        ),
      );
    }
  }

  /**
   * Clean up all calendars for a user in a specific organization
   * This includes unsyncing from MeetingBaas and removing from database
   */
  private async cleanupUserCalendars(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      // Find all calendars for this user in this organization
      const userCalendars = await this.calendarsRepository.find({
        where: {
          organization_id: organizationId,
          profile: { id: userId },
        },
      });

      if (userCalendars.length === 0) {
        return; // No calendars to clean up
      }

      this.logger.log(
        `Cleaning up ${userCalendars.length} calendars for user ${userId} in organization ${organizationId}`,
      );

      // Notify MeetingBaas about calendar deactivations
      for (const calendar of userCalendars) {
        try {
          await this.notifyMeetingBaasCalendarDeactivation(
            calendar.calender_id,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to notify MeetingBaas about calendar ${calendar.calender_id} deactivation: ${error.message}`,
          );
        }
      }

      // Remove calendars from database
      await this.calendarsRepository.remove(userCalendars);
      this.logger.log(
        `Successfully removed ${userCalendars.length} calendars for user ${userId} in organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup calendars for user ${userId} in organization ${organizationId}:`,
        error,
      );
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Notify MeetingBaas about calendar deactivation
   */
  private async notifyMeetingBaasCalendarDeactivation(
    calendarId: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://api.meetingbaas.com/calendars/${calendarId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-meeting-baas-api-key": this.configService.get<string>(
              "MEETING_BAAS_API_KEY",
            ),
          },
          body: JSON.stringify({
            active: false,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `MeetingBaas API responded with status: ${response.status}`,
        );
      }

      this.logger.log(
        `Successfully notified MeetingBaas about calendar ${calendarId} deactivation`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to notify MeetingBaas about calendar ${calendarId} deactivation: ${error.message}`,
      );
      // Don't throw error to avoid breaking the main operation
    }
  }
}
