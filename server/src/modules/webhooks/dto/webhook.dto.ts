import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateWebhookDto {
  @ApiProperty({ description: "Webhook name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Webhook URL" })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: "Whether webhook is active", default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: "Webhook name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Webhook URL" })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: "Whether webhook is active" })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class WebhookResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  secret: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
