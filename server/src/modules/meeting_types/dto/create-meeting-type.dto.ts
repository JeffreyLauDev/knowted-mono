import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateMeetingTypeDto {
  @ApiProperty({ required: true, description: "Name of the meeting type" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    description: "Description of the meeting type",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: "Analysis metadata structure" })
  @IsOptional()
  @IsObject()
  analysis_metadata_structure?: Record<string, string> | null;
}
