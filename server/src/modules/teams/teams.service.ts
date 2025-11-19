import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { UserOrganization } from "../organizations/entities/user-organization.entity";
import { PermissionsService } from "../permissions/permissions.service";

import { CreateTeamsDto } from "./dto/create-teams.dto";
import { TeamResponseDto } from "./dto/team-response.dto";
import { UpdateTeamsDto } from "./dto/update-teams.dto";
import { Teams } from "./entities/teams.entity";

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Teams)
    private teamsRepository: Repository<Teams>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @Inject(forwardRef(() => PermissionsService))
    private permissionsService: PermissionsService,
  ) {}

  private async validateOrganizationAccess(
    organizationId: string,
    userId: string,
  ) {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        "You don't have access to this organization",
      );
    }
  }

  private transformToResponseDto(team: Teams): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      is_admin: team.is_admin,
    };
  }

  async create(
    createTeamsDto: CreateTeamsDto,
    organizationId: string,
    userId: string,
  ) {
    await this.validateOrganizationAccess(organizationId, userId);

    const team = this.teamsRepository.create({
      ...createTeamsDto,
      organization: { id: organizationId },
    });
    const savedTeam = await this.teamsRepository.save(team);

    // Set default permissions for the new team
    await this.permissionsService.bulkSetTeamPermissions(
      organizationId,
      savedTeam.id,
      [
        { resource_type: "reports", access_level: "read" },
        { resource_type: "teams", access_level: "read" },
        { resource_type: "report_types", access_level: "read" },
        { resource_type: "meeting_types", access_level: "read" },
        { resource_type: "permissions", access_level: "none" },
        { resource_type: "users", access_level: "read" },
        { resource_type: "billing", access_level: "read" },
        { resource_type: "calendar", access_level: "read" },
        { resource_type: "organization", access_level: "read" },
      ],
    );

    return this.transformToResponseDto(savedTeam);
  }

  async findAll(organizationId: string, userId: string) {
    await this.validateOrganizationAccess(organizationId, userId);

    const teams = await this.teamsRepository.find({
      where: { organization_id: organizationId },
    });

    return teams.map((team) => this.transformToResponseDto(team));
  }

  async getUserTeams(organizationId: string, userId: string) {
    await this.validateOrganizationAccess(organizationId, userId);

    const userOrgs = await this.userOrganizationRepository.find({
      where: {
        user_id: userId,
        organization_id: organizationId,
      },
      relations: ["team"],
    });

    return userOrgs.map((userOrg) => this.transformToResponseDto(userOrg.team));
  }

  private async findOneInternal(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<Teams> {
    await this.validateOrganizationAccess(organizationId, userId);

    const team = await this.teamsRepository.findOne({
      where: { id, organization: { id: organizationId } },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  async findOne(id: string, organizationId: string, userId: string) {
    const team = await this.findOneInternal(id, organizationId, userId);
    return this.transformToResponseDto(team);
  }

  async update(
    id: string,
    updateTeamsDto: UpdateTeamsDto,
    organizationId: string,
    userId: string,
  ) {
    await this.validateOrganizationAccess(organizationId, userId);
    await this.findOneInternal(id, organizationId, userId);

    await this.teamsRepository.update(id, {
      ...updateTeamsDto,
      organization: { id: organizationId },
    });

    const updatedTeam = await this.findOneInternal(id, organizationId, userId);
    return this.transformToResponseDto(updatedTeam);
  }

  async remove(id: string, organizationId: string, userId: string) {
    await this.validateOrganizationAccess(organizationId, userId);
    await this.findOneInternal(id, organizationId, userId);

    // Check if there are any users in the team
    const teamMembers = await this.userOrganizationRepository.find({
      where: { team_id: id },
    });

    if (teamMembers.length > 0) {
      throw new BadRequestException(
        "Cannot delete team that still has members. Please remove all members first.",
      );
    }

    await this.teamsRepository.delete(id);
    return { deleted: true };
  }

  async getAdminTeams(organizationId: string): Promise<Teams[]> {
    return await this.teamsRepository.find({
      where: { organization_id: organizationId, is_admin: true },
    });
  }
}
