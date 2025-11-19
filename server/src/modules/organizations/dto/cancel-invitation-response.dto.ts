import { ApiProperty } from "@nestjs/swagger";

export class CancelInvitationResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Invitation cancelled successfully",
  })
  message: string;

  @ApiProperty({
    description: "ID of the cancelled invitation",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  invitation_id: string;
}
