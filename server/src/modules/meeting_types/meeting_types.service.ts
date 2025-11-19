import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { PermissionsService } from "../permissions/permissions.service";
import { TeamsService } from "../teams/teams.service";
import { UsageEventsService } from "../usage-events/usage-events.service";

import { CreateMeetingTypeDto } from "./dto/create-meeting-type.dto";
import { GetMeetingTypesDto } from "./dto/get-meeting-types.dto";
import { UpdateMeetingTypeDto } from "./dto/update-meeting-type.dto";
import {
  AnalysisMetadataStructure,
  MeetingType,
  MeetingTypeResponse,
} from "./entities/meeting_types.entity";

@Injectable()
export class MeetingTypesService {
  constructor(
    @InjectRepository(MeetingType)
    private meetingTypeRepository: Repository<MeetingType>,
    private permissionsService: PermissionsService,
    private teamsService: TeamsService,
    private usageEventsService: UsageEventsService,
  ) {}

  async findAll(query: GetMeetingTypesDto): Promise<MeetingTypeResponse[]> {
    const meetingTypes = await this.meetingTypeRepository.find({
      where: { organization_id: query.organization_id },
      select: {
        id: true,
        name: true,
        description: true,
        analysis_metadata_structure: true,
      },
    });

    return meetingTypes;
  }

  async create(
    createMeetingTypeDto: CreateMeetingTypeDto,
    organization_id: string,
    userId: string,
  ): Promise<MeetingTypeResponse> {
    // Get user's teams in the organization
    const userTeams = await this.teamsService.getUserTeams(
      organization_id,
      userId,
    );

    if (userTeams.length === 0) {
      throw new NotFoundException(
        "No teams found for the user in this organization",
      );
    }

    // Use the first team the user belongs to
    const teamId = userTeams[0].id;

    const meetingType = this.meetingTypeRepository.create({
      name: createMeetingTypeDto.name,
      description: createMeetingTypeDto.description,
      analysis_metadata_structure:
        createMeetingTypeDto.analysis_metadata_structure as AnalysisMetadataStructure,
      organization_id,
    });

    const savedMeetingType = await this.meetingTypeRepository.save(meetingType);

    // Track meeting type creation
    await this.usageEventsService.trackMeetingTypeCreated(
      organization_id,
      userId,
      savedMeetingType.id,
    );

    // Get admin teams and assign read/write permissions
    const adminTeams = await this.teamsService.getAdminTeams(organization_id);

    // Create permissions for admin teams
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

    // Create permission for the user's team (if not already an admin team)
    const userTeamIsAdmin = adminTeams.some(
      (adminTeam) => adminTeam.id === teamId,
    );
    if (!userTeamIsAdmin) {
      await this.permissionsService.create({
        resource_type: "meeting_types",
        resource_id: savedMeetingType.id,
        access_level: "readWrite",
        team_id: teamId,
      });
    }

    return {
      id: savedMeetingType.id,
      name: savedMeetingType.name,
      description: savedMeetingType.description,
      analysis_metadata_structure: savedMeetingType.analysis_metadata_structure,
    };
  }

  async update(
    id: string,
    updateMeetingTypeDto: UpdateMeetingTypeDto,
    organization_id: string,
  ): Promise<MeetingTypeResponse> {
    const meetingType = await this.meetingTypeRepository.findOne({
      where: { id, organization_id },
    });

    if (!meetingType) {
      throw new NotFoundException(
        `Meeting type with ID ${id} not found in the specified organization`,
      );
    }

    const updatedMeetingType = await this.meetingTypeRepository.save({
      ...meetingType,
      ...updateMeetingTypeDto,
      analysis_metadata_structure:
        updateMeetingTypeDto.analysis_metadata_structure as AnalysisMetadataStructure,
    });

    return {
      id: updatedMeetingType.id,
      name: updatedMeetingType.name,
      description: updatedMeetingType.description,
      analysis_metadata_structure:
        updatedMeetingType.analysis_metadata_structure,
    };
  }

  async remove(
    id: string,
    organization_id: string,
    userId: string,
  ): Promise<void> {
    const meetingType = await this.meetingTypeRepository.findOne({
      where: { id, organization_id },
    });

    if (!meetingType) {
      throw new NotFoundException(
        `Meeting type with ID ${id} not found in the specified organization`,
      );
    }

    // Track meeting type deletion
    await this.usageEventsService.trackMeetingTypeDeleted(
      organization_id,
      userId,
      meetingType.id,
    );

    await this.meetingTypeRepository.remove(meetingType);
  }
}
