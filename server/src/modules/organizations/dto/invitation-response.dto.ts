import { ApiProperty } from "@nestjs/swagger";

export class OrganizationInfoDto {
  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Organization name",
    example: "Acme Corporation",
  })
  name: string;

  @ApiProperty({
    description: "Organization description",
    example: "A leading technology company",
    required: false,
  })
  description?: string;
}

export class TeamInfoDto {
  @ApiProperty({
    description: "Team ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Team name",
    example: "Engineering",
  })
  name: string;

  @ApiProperty({
    description: "Team description",
    example: "Software development team",
    required: false,
  })
  description?: string;
}

export class InvitedByDto {
  @ApiProperty({
    description: "User ID of the person who sent the invitation",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "First name of the person who sent the invitation",
    example: "John",
  })
  first_name: string;

  @ApiProperty({
    description: "Last name of the person who sent the invitation",
    example: "Doe",
  })
  last_name: string;

  @ApiProperty({
    description: "Email of the person who sent the invitation",
    example: "john.doe@example.com",
  })
  email: string;
}

export class InvitationResponseDto {
  @ApiProperty({
    description: "Invitation ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "Organization information",
    type: OrganizationInfoDto,
    required: false,
  })
  organization?: OrganizationInfoDto;

  @ApiProperty({
    description: "Team information",
    type: TeamInfoDto,
    required: false,
  })
  team?: TeamInfoDto;

  @ApiProperty({
    description: "Information about who sent the invitation",
    type: InvitedByDto,
    required: false,
  })
  invited_by?: InvitedByDto;

  @ApiProperty({
    description: "User role in the organization",
    example: "member",
    required: false,
  })
  role?: string;

  @ApiProperty({
    description: "Invitation status",
    example: "pending",
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: "When the invitation was created",
    example: "2024-01-15T10:30:00Z",
    required: false,
  })
  created_at?: string;

  @ApiProperty({
    description: "When the invitation expires",
    example: "2024-01-22T10:30:00Z",
    required: false,
  })
  expires_at?: string;

  @ApiProperty({
    description: "Email of the invited user",
    example: "user@example.com",
    required: false,
  })
  email?: string;
}
