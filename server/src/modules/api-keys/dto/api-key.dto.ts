import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateApiKeyDto {
  @ApiProperty({ description: "API key name" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Whether API key is active", default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: "API key name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Whether API key is active" })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
