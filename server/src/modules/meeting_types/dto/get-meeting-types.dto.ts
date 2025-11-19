import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsUUID } from "class-validator";

export class GetMeetingTypesDto {
  @ApiProperty({ description: "Organization ID" })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;
}
