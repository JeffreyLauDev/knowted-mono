import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsObject, IsString } from "class-validator";

import { MessageContentDto } from "./message-content.dto";

export class CreateAiConversationHistoriesDto {
  @ApiProperty({ description: "The message content", type: MessageContentDto })
  @IsNotEmpty()
  @IsObject()
  message: MessageContentDto;

  @ApiProperty({ description: "The session ID" })
  @IsNotEmpty()
  @IsString()
  session_id: string;
}
