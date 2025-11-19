import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsString } from "class-validator";

export class CreateAiConversationSessionsDto {
  @ApiProperty({
    description: "The initial chat input for the conversation",
    example: "What are the best practices for React development?",
  })
  @IsString()
  @IsNotEmpty()
  input: string;
}
