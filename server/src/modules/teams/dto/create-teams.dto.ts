import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTeamsDto {
  @ApiProperty({
    description: "Name of the team",
    example: "Engineering Team",
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "Description of the team",
    example: "Team responsible for software development and maintenance",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
