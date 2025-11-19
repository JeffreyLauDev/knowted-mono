import { ApiProperty } from "@nestjs/swagger";

export class OrganizationMemberResponseDto {
  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
  })
  first_name: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
  })
  last_name: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
  })
  email: string;

  @ApiProperty({
    description: "Team name the user belongs to",
    example: "Engineering Team",
  })
  team: string;
}
