import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class FindOneMeetingDto {
  @ApiProperty({ required: true, description: "Organization ID" })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty({ required: false, description: "Filter by team ID" })
  @IsOptional()
  @IsUUID()
  team_id?: string;
}
