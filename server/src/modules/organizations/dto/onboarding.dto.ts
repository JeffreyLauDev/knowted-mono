import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class OnboardingDto {
  @ApiProperty({
    description: "Organization name",
    example: "Acme Corporation",
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "Organization website URL",
    required: false,
    example: "https://example.com",
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: "Company analysis or overview",
    required: false,
    example:
      "We are a SaaS company focused on providing innovative solutions for small businesses.",
  })
  @IsOptional()
  @IsString()
  company_analysis?: string;

  @ApiProperty({
    description: "Type of company",
    required: false,
    example: "SaaS, E-commerce, Agency, Consulting",
  })
  @IsOptional()
  @IsString()
  company_type?: string;

  @ApiProperty({
    description: "Team size",
    required: false,
    example: "1-10, 11-50, 51-200, 200+",
  })
  @IsOptional()
  @IsString()
  team_size?: string;

  @ApiProperty({
    description: "Business description",
    required: false,
    example: "Detailed description of what the business does and its mission",
  })
  @IsOptional()
  @IsString()
  business_description?: string;

  @ApiProperty({
    description: "What the business offers",
    required: false,
    example: "Software solutions, consulting services, digital products",
  })
  @IsOptional()
  @IsString()
  business_offering?: string;

  @ApiProperty({
    description: "Industry",
    required: false,
    example: "Technology, Healthcare, Finance, Education",
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: "Target audience",
    required: false,
    example: "Small businesses, Enterprise clients, Startups",
  })
  @IsOptional()
  @IsString()
  target_audience?: string;

  @ApiProperty({
    description: "Marketing channels",
    required: false,
    example: "Social media, Email marketing, Content marketing, SEO",
  })
  @IsOptional()
  @IsString()
  channels?: string;
}
