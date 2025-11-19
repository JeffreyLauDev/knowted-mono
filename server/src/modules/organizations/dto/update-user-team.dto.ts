import { ApiProperty } from "@nestjs/swagger";

import { IsString, IsUUID } from "class-validator";

export class UpdateUserTeamDto {
  @ApiProperty({
    description: "Team ID to assign the user to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsUUID()
  team_id: string;
}
