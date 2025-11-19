import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsUUID } from "class-validator";

export class GetReportTypesDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;
}
