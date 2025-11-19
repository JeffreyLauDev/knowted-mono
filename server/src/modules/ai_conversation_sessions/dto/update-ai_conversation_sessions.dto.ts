import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString } from "class-validator";

export class UpdateAiConversationSessionsDto {
  @ApiProperty({
    description: "The new title for the conversation session",
    example: "Updated React Development Discussion",
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
