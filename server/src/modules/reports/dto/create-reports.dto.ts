import { ApiProperty } from "@nestjs/swagger";

import { IsDate, IsEnum, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateReportsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  report_title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  report_date: string;

  @ApiProperty()
  @IsNotEmpty()
  report_detail: Record<string, unknown>;

  @ApiProperty()
  @IsNotEmpty()
  report_prompt: Record<string, unknown>;

  @ApiProperty({ enum: ["pending", "completed", "failed"] })
  @IsNotEmpty()
  @IsEnum(["pending", "completed", "failed"])
  report_status: "pending" | "completed" | "failed";

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  meeting_type_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  report_type_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}
