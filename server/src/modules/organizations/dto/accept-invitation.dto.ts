import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AcceptInvitationDto {
  @ApiProperty({
    description: "The invitation UUID to accept",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  @IsNotEmpty()
  @IsString()
  invitation_id: string;
}
