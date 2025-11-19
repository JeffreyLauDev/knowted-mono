import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

import {
  ACCESS_LEVELS,
  AccessLevel,
  RESOURCE_TYPES,
  ResourceType,
} from "../types/permissions.types";

export class BulkSetTeamPermissionsDto {
  @ApiProperty({
    enum: RESOURCE_TYPES,
    description: "Type of resource to set permissions for",
  })
  @IsEnum(RESOURCE_TYPES)
  @IsNotEmpty()
  resource_type: ResourceType;

  @ApiProperty({
    description:
      "ID of the specific resource (optional - if not provided, sets general resource type permission)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @ApiProperty({
    enum: ACCESS_LEVELS,
    description: "Access level for the resource",
  })
  @IsEnum(ACCESS_LEVELS)
  @IsNotEmpty()
  access_level: AccessLevel;
}
