import { ApiProperty } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class BulkInviteUserItemDto {
  @ApiProperty({
    description: "Email of the user to invite",
    example: "user@example.com",
  })
  @IsEmail()
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

export class BulkInviteUsersDto {
  @ApiProperty({
    description: "Array of users to invite",
    type: [BulkInviteUserItemDto],
    example: [
      {
        email: "user1@example.com",
        team_id: "123e4567-e89b-12d3-a456-426614174000",
      },
      {
        email: "user2@example.com",
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one user must be invited" })
  @ValidateNested({ each: true })
  @Type(() => BulkInviteUserItemDto)
  users: BulkInviteUserItemDto[];
}
