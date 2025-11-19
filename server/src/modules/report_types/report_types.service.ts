import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { PermissionsService } from "../permissions/permissions.service";
import { TeamsService } from "../teams/teams.service";

import { CreateReportTypesDto } from "./dto/create-report_types.dto";
import { GetReportTypesDto } from "./dto/get-report-types.dto";
import { ReportTypeResponseDto } from "./dto/report-type-response.dto";
import { UpdateReportTypesDto } from "./dto/update-report_types.dto";
import { ReportTypes } from "./entities/report_types.entity";

@Injectable()
export class ReportTypesService {
  constructor(
    @InjectRepository(ReportTypes)
    private report_typesRepository: Repository<ReportTypes>,
    private permissionsService: PermissionsService,
    private teamsService: TeamsService,
    private logger: PinoLoggerService,
  ) {}

  async create(createReportTypesDto: CreateReportTypesDto) {
    // Validate required fields
    if (
      !createReportTypesDto.report_title ||
      !createReportTypesDto.report_prompt
    ) {
      throw new BadRequestException("Report title and prompt are required");
    }

    // Validate report schedule format
    if (
      !createReportTypesDto.report_schedule ||
      !createReportTypesDto.report_schedule.day ||
      !createReportTypesDto.report_schedule.time ||
      !createReportTypesDto.report_schedule.frequency
    ) {
      throw new BadRequestException("Invalid report schedule format");
    }

    // Validate frequency
    const validFrequencies = ["weekly", "monthly", "quarterly"];
    if (
      !validFrequencies.includes(createReportTypesDto.report_schedule.frequency)
    ) {
      throw new BadRequestException(
        "Invalid frequency. Must be one of: weekly, monthly, quarterly",
      );
    }

    // Extract meeting_types from the DTO
    const { meeting_types, ...reportData } = createReportTypesDto;

    // Convert ISO date strings to Date objects if they exist
    const finalReportData = {
      ...reportData,
      active: reportData.active ?? true,
      generation_date: reportData.generation_date
        ? new Date(reportData.generation_date)
        : null,
      run_at_utc: reportData.run_at_utc
        ? new Date(reportData.run_at_utc)
        : null,
    };

    // Start a transaction to ensure data consistency
    const queryRunner =
      this.report_typesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the report type
      const report_types = this.report_typesRepository.create(finalReportData);
      const savedReportType = await queryRunner.manager.save(
        ReportTypes,
        report_types,
      );

      // If meeting_types are provided, create the relationships
      if (meeting_types && meeting_types.length > 0) {
        const values = meeting_types
          .map((_, index) => `($1, $${index + 2})`)
          .join(", ");
        const params = [savedReportType.id, ...meeting_types];
        await queryRunner.manager.query(
          `INSERT INTO report_type_meeting_types (report_type_id, meeting_type_id) VALUES ${values}`,
          params,
        );
      }

      // Get admin teams and assign read/write permissions
      const adminTeams = await this.teamsService.getAdminTeams(
        createReportTypesDto.organization_id,
      );

      // Create permissions for admin teams
      await Promise.all(
        adminTeams.map((adminTeam) =>
          this.permissionsService.setTeamPermissions(
            createReportTypesDto.organization_id,
            adminTeam.id,
            {
              resource_type: "report_types",
              resource_id: savedReportType.id,
              access_level: "readWrite",
            },
          ),
        ),
      );

      // Get all teams for the user in the organization
      const teams = await this.teamsService.getUserTeams(
        createReportTypesDto.organization_id,
        createReportTypesDto.user_id,
      );

      // Grant access to user's teams (if not already admin teams)
      if (teams && teams.length > 0) {
        const adminTeamIds = adminTeams.map((adminTeam) => adminTeam.id);

        const nonAdminTeams = teams.filter(
          (team) => !adminTeamIds.includes(team.id),
        );

        if (nonAdminTeams.length > 0) {
          await Promise.all(
            nonAdminTeams.map((team) =>
              this.permissionsService.setTeamPermissions(
                createReportTypesDto.organization_id,
                team.id,
                {
                  resource_type: "report_types",
                  resource_id: savedReportType.id,
                  access_level: "readWrite",
                },
              ),
            ),
          );
        }
      }

      await queryRunner.commitTransaction();
      return await this.findOne(
        savedReportType.id,
        createReportTypesDto.organization_id,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: Partial<ReportTypes> = {}) {
    return await this.report_typesRepository.find({
      where: query,
    });
  }

  async findOne(id: string, organizationId: string) {
    const reportType = await this.report_typesRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: ["meeting_types"],
    });

    if (!reportType) {
      throw new NotFoundException(
        `Report type with ID ${id} not found in this organization`,
      );
    }

    return reportType;
  }

  async update(
    id: string,
    organizationId: string,
    updateReportTypesDto: UpdateReportTypesDto & { user_id: string },
  ) {
    await this.findOne(id, organizationId); // Verify report type exists in organization

    // Validate report schedule if provided
    if (updateReportTypesDto.report_schedule) {
      if (
        !updateReportTypesDto.report_schedule.day ||
        !updateReportTypesDto.report_schedule.time ||
        !updateReportTypesDto.report_schedule.frequency
      ) {
        throw new BadRequestException("Invalid report schedule format");
      }

      const validFrequencies = ["weekly", "monthly", "quarterly"];
      if (
        !validFrequencies.includes(
          updateReportTypesDto.report_schedule.frequency,
        )
      ) {
        throw new BadRequestException(
          "Invalid frequency. Must be one of: weekly, monthly, quarterly",
        );
      }
    }

    // Get all teams for the user in the organization
    const teams = await this.teamsService.getUserTeams(
      organizationId,
      updateReportTypesDto.user_id,
    );

    // Check if user has permission to update this report type
    const hasPermission = await Promise.all(
      teams.map((team) =>
        this.permissionsService.checkPermission(
          team.id,
          "report_types",
          id,
          "readWrite",
        ),
      ),
    );

    if (!hasPermission.some((permission) => permission)) {
      throw new BadRequestException(
        "You don't have permission to update this report type",
      );
    }

    // Extract meeting_types from the DTO
    const { meeting_types, ...updateData } = updateReportTypesDto;

    // Start a transaction to ensure data consistency
    const queryRunner =
      this.report_typesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update the report type
      await queryRunner.manager.update(
        ReportTypes,
        { id, organization_id: organizationId },
        updateData,
      );

      // If meeting_types are provided, update the relationships
      if (meeting_types) {
        // Delete existing relationships
        await queryRunner.manager.query(
          `DELETE FROM report_type_meeting_types WHERE report_type_id = $1`,
          [id],
        );

        // Insert new relationships
        if (meeting_types.length > 0) {
          const values = meeting_types
            .map((_, index) => `($1, $${index + 2})`)
            .join(", ");
          const params = [id, ...meeting_types];
          await queryRunner.manager.query(
            `INSERT INTO report_type_meeting_types (report_type_id, meeting_type_id) VALUES ${values}`,
            params,
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return await this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const reportType = await this.findOne(id, organizationId);

    // Delete all permissions associated with this report type
    await this.permissionsService.deletePermissionsByResource(
      "report_types",
      id,
    );

    await this.report_typesRepository.remove(reportType);
    return { deleted: true };
  }

  async getReportTypesWithPermissions(
    getReportTypesDto: GetReportTypesDto,
    userId: string,
  ): Promise<ReportTypeResponseDto[]> {
    try {
      // Get all teams for the user in the organization
      const teams = await this.teamsService.getUserTeams(
        getReportTypesDto.organization_id,
        userId,
      );

      if (!teams || teams.length === 0) {
        return [];
      }

      // Get all report types for the organization with meeting types
      const reportTypes = await this.report_typesRepository.find({
        where: { organization_id: getReportTypesDto.organization_id },
        relations: ["meeting_types"],
        select: {
          id: true,
          report_title: true,
          report_prompt: true,
          report_schedule: true,
          organization_id: true,
          active: true,
          generation_date: true,
          run_at_utc: true,
          meeting_types: {
            id: true,
            name: true,
            description: true,
          },
        },
      });

      if (!reportTypes || reportTypes.length === 0) {
        return [];
      }

      // Filter report types based on permissions
      const accessibleReportTypes = await Promise.all(
        reportTypes.map(async (reportType) => {
          try {
            // Check permissions for all teams
            const permissionChecks = await Promise.all(
              teams.map((team) =>
                this.permissionsService.checkPermission(
                  team.id,
                  "report_types",
                  reportType.id,
                  "read",
                ),
              ),
            );

            // If any team has permission, include the report type
            if (permissionChecks.some((hasPermission) => hasPermission)) {
              return {
                ...reportType,
                meeting_types:
                  reportType.meeting_types?.map((mt) => ({
                    id: mt.id,
                    name: mt.name,
                    description: mt.description,
                  })) || [],
              };
            }
            return null;
          } catch (error) {
            this.logger.error(
              `Error checking permissions for report type ${reportType.id}:`,
              undefined,
              "ReportTypesService",
              error,
            );
            return null;
          }
        }),
      );

      return accessibleReportTypes.filter((reportType) => reportType !== null);
    } catch (error) {
      this.logger.error(
        "Error getting report types with permissions:",
        undefined,
        "ReportTypesService",
        error,
      );
      throw error;
    }
  }
}
