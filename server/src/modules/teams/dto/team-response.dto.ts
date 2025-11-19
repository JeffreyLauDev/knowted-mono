import { ApiProperty } from "@nestjs/swagger";

export class TeamResponseDto {
  @ApiProperty({ description: "The unique identifier of the team" })
  id: string;

  @ApiProperty({ description: "Name of the team" })
  name: string;

  @ApiProperty({ description: "Description of the team", required: false })
  description: string;

  @ApiProperty({
    description: "Whether this team is an admin team",
    example: false,
  })
  is_admin: boolean;
}
