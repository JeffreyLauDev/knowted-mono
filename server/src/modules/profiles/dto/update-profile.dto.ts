import { ApiProperty } from "@nestjs/swagger";

import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({
    description: "User's first name",
    example: "John",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @ApiProperty({
    description: "User's last name",
    example: "Doe",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;
}
