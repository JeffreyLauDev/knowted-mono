import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

import {
  GENERIC_RESOURCE_TYPES,
  GenericResourceType,
  SPECIFIC_RESOURCE_TYPES,
  SpecificResourceType,
} from "../types/permissions.types";

export class SetTeamPermissionsDto {
  @ApiProperty({
    enum: [...GENERIC_RESOURCE_TYPES, ...SPECIFIC_RESOURCE_TYPES],
    description: "Type of resource to set permissions for",
  })
  @IsEnum([...GENERIC_RESOURCE_TYPES, ...SPECIFIC_RESOURCE_TYPES])
  @IsNotEmpty()
  resource_type: GenericResourceType | SpecificResourceType;

  @ApiProperty({
    description:
      "ID of the resource (required for both generic and specific resources)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  @IsNotEmpty()
  resource_id: string;

  @ApiProperty({
    enum: ["read", "readWrite"],
    description: "Access level for the resource",
  })
  @IsEnum(["read", "readWrite"])
  @IsNotEmpty()
  access_level: "read" | "readWrite";
}
