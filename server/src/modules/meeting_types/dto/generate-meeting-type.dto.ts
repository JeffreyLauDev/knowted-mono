import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateMeetingTypeDto {
  @ApiProperty({
    description: 'The objective or purpose for the new meeting type',
    example: 'Firing',
  })
  @IsString()
  @IsNotEmpty()
  objective: string;

  @ApiProperty({
    description: 'Organization name for context',
    example: 'Grayza',
    required: false,
  })
  @IsString()
  @IsOptional()
  organisation?: string;

  @ApiProperty({
    description: 'Organization description for context',
    example: 'Grayza a QR code ordering software for restaurants',
    required: false,
  })
  @IsString()
  @IsOptional()
  organisation_about?: string;

  @ApiProperty({
    description: 'Existing meeting types for context',
    example: 'Sales - This type of call is for when we are preparing someone to purchase something from our company | Support - This meeting type is give an existing customer support with our product',
    required: false,
  })
  @IsString()
  @IsOptional()
  meeting_types?: string;
}

export class GeneratedMeetingTypeResponseDto {
  @ApiProperty({
    description: 'The generated meeting type name',
    example: 'Firing',
  })
  meeting_type: string;

  @ApiProperty({
    description: 'The generated meeting type description',
    example: 'This meeting type is used internally to address the termination of an employee, ensuring all legal, HR, and logistical aspects are properly handled.',
  })
  meeting_type_description: string;

  @ApiProperty({
    description: 'The generated analysis metadata structure',
    example: {
      'Target Employee': 'The name or ID of the individual subject to termination',
      'Reason for Termination': 'Key justification or performance-based evidence leading to the decision',
      'Termination Date': 'The proposed final date of employment',
    },
  })
  analysis_metadata_structure: Record<string, string>;
}
