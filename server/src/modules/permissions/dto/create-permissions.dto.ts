import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

import {
  ACCESS_LEVELS,
  AccessLevel,
  RESOURCE_TYPES,
  ResourceType,
} from "../types/permissions.types";

export class CreatePermissionsDto {
  @ApiProperty({ enum: RESOURCE_TYPES })
  @IsNotEmpty()
  @IsEnum(RESOURCE_TYPES)
  resource_type: ResourceType;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  resource_id: string;

  @ApiProperty({ enum: ACCESS_LEVELS })
  @IsNotEmpty()
  @IsEnum(ACCESS_LEVELS)
  access_level: AccessLevel;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  team_id: string;
}
