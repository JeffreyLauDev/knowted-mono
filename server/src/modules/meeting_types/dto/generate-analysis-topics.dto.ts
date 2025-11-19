import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateAnalysisTopicsDto {
  @ApiProperty({
    description: 'The meeting type name',
    example: 'Performance Review',
  })
  @IsString()
  @IsNotEmpty()
  meeting_type: string;

  @ApiProperty({
    description: 'The meeting type description',
    example: 'This meeting type is used internally to address the termination of an employee, ensuring all legal, HR, and logistical aspects are properly handled.',
  })
  @IsString()
  @IsNotEmpty()
  meeting_type_description: string;

  @ApiProperty({
    description: 'Organization name for context',
    example: 'Grayza',
    required: false,
  })
  @IsString()
  organisation?: string;

  @ApiProperty({
    description: 'Organization description for context',
    example: 'Grayza a QR code ordering software for restaurants',
    required: false,
  })
  @IsString()
  organisation_about?: string;
}

export class GeneratedAnalysisTopicsResponseDto {
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
