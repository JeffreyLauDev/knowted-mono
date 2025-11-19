import { ApiProperty } from "@nestjs/swagger";

export class OrganizationResponseDto {
  @ApiProperty({ description: "Organization ID" })
  id: string;

  @ApiProperty({ description: "Organization name" })
  name?: string;

  @ApiProperty({ description: "Organization website URL" })
  website?: string;

  @ApiProperty({ description: "Company analysis or overview" })
  company_analysis?: string;

  @ApiProperty({ description: "Type of company" })
  company_type?: string;

  @ApiProperty({ description: "Team size" })
  team_size?: string;

  @ApiProperty({ description: "Business description" })
  business_description?: string;

  @ApiProperty({ description: "What the business offers" })
  business_offering?: string;

  @ApiProperty({ description: "Industry" })
  industry?: string;

  @ApiProperty({ description: "Target audience" })
  target_audience?: string;

  @ApiProperty({ description: "Marketing channels" })
  channels?: string;
}
