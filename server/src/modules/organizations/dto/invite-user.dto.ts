import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class InviteUserDto {
  @ApiProperty({
    description: "Email of the user to invite",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Team ID to add the user to",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  @IsString()
  @IsOptional()
  team_id?: string;
}
