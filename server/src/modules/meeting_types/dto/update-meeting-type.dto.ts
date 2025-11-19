import { ApiProperty } from "@nestjs/swagger";

import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateMeetingTypeDto {
  @ApiProperty({ required: false, description: "Name of the meeting type" })
  @IsOptional()
  @IsString()
  name?: string;

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
  analysis_metadata_structure?: Record<string, unknown>;
}
