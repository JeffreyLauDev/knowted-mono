import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Request } from "express";
import { In, Repository } from "typeorm";

import { Teams } from "../teams/entities/teams.entity";

import { BulkSetTeamPermissionsDto } from "./dto/bulk-set-team-permissions.dto";
import { CreatePermissionsDto } from "./dto/create-permissions.dto";
import { SetTeamPermissionsDto } from "./dto/set-team-permissions.dto";
import { UpdatePermissionsDto } from "./dto/update-permissions.dto";
import { Permissions } from "./entities/permissions.entity";
import { AccessLevel, ResourceType } from "./types/permissions.types";

interface PermissionQuery {
  team_id?: string;
  resource_type?: ResourceType;
  resource_id?: string;
  access_level?: AccessLevel;
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permissions)
    private permissionsRepository: Repository<Permissions>,
    @InjectRepository(Teams)
    private teamsRepository: Repository<Teams>,
  ) {}

  async create(createPermissionsDto: CreatePermissionsDto) {
    // Check if permission already exists for this team and resource
    const existingPermission = await this.permissionsRepository.findOne({
      where: {
        team_id: createPermissionsDto.team_id,
        resource_type: createPermissionsDto.resource_type,
        resource_id: createPermissionsDto.resource_id,
      },
    });

    if (existingPermission) {
      throw new BadRequestException(
        "Permission already exists for this team and resource",
      );
    }

    const permission = this.permissionsRepository.create(createPermissionsDto);
    return await this.permissionsRepository.save(permission);
  }

  async findAll(query: PermissionQuery = {}) {
    return await this.permissionsRepository.find({
      where: query,
      relations: ["team"],
    });
  }

  async findOne(id: string) {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ["team"],
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findByTeamAndResource(
    organizationId: string,
    teamId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    // First verify the team belongs to the organization

    const team = await this.teamsRepository.findOne({
      where: { id: teamId, organization_id: organizationId },
    });

    if (!team) {
      throw new NotFoundException("Team not found in this organization");
    }

    const permission = await this.permissionsRepository.findOne({
      where: {
        team_id: teamId,
        resource_type: resourceType,
        resource_id: resourceId,
      },
      relations: ["team"],
    });

    if (!permission) {
      throw new NotFoundException("Permission not found");
    }

    return permission;
  }

  async update(id: string, updatePermissionsDto: UpdatePermissionsDto) {
    const permission = await this.findOne(id);

    // Check if updating would create a duplicate
    if (
      updatePermissionsDto.team_id ||
      updatePermissionsDto.resource_type ||
      updatePermissionsDto.resource_id
    ) {
      const existingPermission = await this.permissionsRepository.findOne({
        where: {
          team_id: updatePermissionsDto.team_id || permission.team_id,
          resource_type:
            updatePermissionsDto.resource_type || permission.resource_type,
          resource_id:
            updatePermissionsDto.resource_id || permission.resource_id,
        },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw new BadRequestException(
          "Permission already exists for this team and resource",
        );
      }
    }

    await this.permissionsRepository.update(id, updatePermissionsDto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
    return { deleted: true };
  }

  async checkPermission(
    teamId: string,
    resourceType: ResourceType,
    resourceId: string | null,
    requiredPermission: AccessLevel,
  ) {
    // Check for general resource type permission first
    const generalPermissions = await this.permissionsRepository.find({
      where: {
        team_id: teamId,
        resource_type: resourceType,
        resource_id: null,
      },
    });

    const hasGeneralPermission = generalPermissions.some((permission) => {
      if (requiredPermission === "read") {
        return (
          permission.access_level === "read" ||
          permission.access_level === "readWrite"
        );
      } else {
        return permission.access_level === "readWrite";
      }
    });

    // If user has general permission, grant access
    if (hasGeneralPermission) {
      return true;
    }

    // If no general permission and no specific resource ID provided, deny access
    if (!resourceId) {
      return false;
    }

    // Check for specific resource permission
    const specificPermission = await this.permissionsRepository.findOne({
      where: {
        team_id: teamId,
        resource_type: resourceType,
        resource_id: resourceId,
      },
    });

    if (!specificPermission) {
      return false;
    }

    if (requiredPermission === "read") {
      return (
        specificPermission.access_level === "read" ||
        specificPermission.access_level === "readWrite"
      );
    } else {
      return specificPermission.access_level === "readWrite";
    }
  }

  async getResourceIdForPermission(
    resourceType: ResourceType,
    request: Request,
  ): Promise<string | null> {
    switch (resourceType) {
      case "meeting_types":
        // For meeting types, check params.id first, then meeting_type_id in body
        return request.params.id || request.body?.meeting_type_id || null;
      case "report_types":
        // For report types, check params.id first, then report_type_id in body
        return request.params.id || request.body?.report_type_id || null;
      default:
        return null;
    }
  }

  async findByTeam(organizationId: string, teamId: string) {
    // First verify the team belongs to the organization
    const team = await this.teamsRepository.findOne({
      where: { id: teamId, organization_id: organizationId },
    });

    if (!team) {
      throw new NotFoundException("Team not found in this organization");
    }

    const permissions = await this.permissionsRepository.find({
      where: { team_id: teamId },
      select: {
        resource_type: true,
        resource_id: true,
        access_level: true,
      },
    });

    return permissions;
  }

  async findByOrganization(organizationId: string) {
    // Get all teams in the organization
    const teams = await this.teamsRepository.find({
      where: { organization_id: organizationId },
    });

    if (!teams.length) {
      return [];
    }

    // Get all permissions for all teams in the organization
    const permissions = await this.permissionsRepository.find({
      where: { team_id: In(teams.map((team) => team.id)) },
      relations: ["team"],
      select: {
        resource_type: true,
        resource_id: true,
        access_level: true,
        team: {
          id: true,
          name: true,
        },
      },
    });

    return permissions;
  }

  async setTeamPermissions(
    organizationId: string,
    teamId: string,
    dto: SetTeamPermissionsDto,
  ) {
    // Check if team exists and belongs to the organization
    const team = await this.teamsRepository.findOne({
      where: { id: teamId, organization_id: organizationId },
    });

    if (!team) {
      throw new NotFoundException("Team not found in this organization");
    }

    // Create or update permission
    const permission = await this.permissionsRepository.findOne({
      where: {
        team_id: teamId,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
      },
    });

    if (permission) {
      // Update existing permission
      permission.access_level = dto.access_level;
      return this.permissionsRepository.save(permission);
    } else {
      // Create new permission
      const newPermission = this.permissionsRepository.create({
        team_id: teamId,
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        access_level: dto.access_level,
      });
      return this.permissionsRepository.save(newPermission);
    }
  }

  async bulkSetTeamPermissions(
    organizationId: string,
    teamId: string,
    permissions: BulkSetTeamPermissionsDto[],
  ) {
    // Check if team exists and belongs to the organization
    const team = await this.teamsRepository.findOne({
      where: { id: teamId, organization_id: organizationId },
    });

    if (!team) {
      throw new NotFoundException("Team not found in this organization");
    }

    const results = [];
    for (const permission of permissions) {
      // Create or update permission
      const existingPermission = await this.permissionsRepository.findOne({
        where: {
          team_id: teamId,
          resource_type: permission.resource_type,
          resource_id: permission.resource_id || null, // Use the provided resource_id or null for general permissions
        },
      });

      if (existingPermission) {
        // Update existing permission
        existingPermission.access_level = permission.access_level;
        results.push(await this.permissionsRepository.save(existingPermission));
      } else {
        // Create new permission
        const newPermission = this.permissionsRepository.create({
          team_id: teamId,
          resource_type: permission.resource_type,
          resource_id: permission.resource_id || null, // Use the provided resource_id or null for general permissions
          access_level: permission.access_level,
        });
        results.push(await this.permissionsRepository.save(newPermission));
      }
    }

    return results;
  }

  async deletePermissionsByResource(
    resourceType: ResourceType,
    resourceId: string,
  ) {
    const permissions = await this.permissionsRepository.find({
      where: {
        resource_type: resourceType,
        resource_id: resourceId,
      },
    });

    if (permissions.length > 0) {
      await this.permissionsRepository.remove(permissions);
    }

    return { deleted: true, count: permissions.length };
  }
}
