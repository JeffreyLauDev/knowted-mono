import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CancelInvitationDto {
  @ApiProperty({
    description: "Invitation ID to cancel",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  invitation_id: string;
}
