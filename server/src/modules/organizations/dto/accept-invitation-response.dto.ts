import { ApiProperty } from "@nestjs/swagger";

import { OrganizationInfoDto, TeamInfoDto } from "./invitation-response.dto";

export class AcceptInvitationResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Invitation accepted successfully",
  })
  message: string;

  @ApiProperty({
    description: "Organization information",
    type: OrganizationInfoDto,
  })
  organization: OrganizationInfoDto;

  @ApiProperty({
    description: "Team information",
    type: TeamInfoDto,
  })
  team: TeamInfoDto;
}
