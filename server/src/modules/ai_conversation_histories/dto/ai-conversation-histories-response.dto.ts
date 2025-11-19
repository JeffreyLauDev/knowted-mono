import { ApiProperty } from "@nestjs/swagger";

import { MessageContentDto } from "./message-content.dto";

export class AiConversationHistoriesResponseDto {
  @ApiProperty({ description: "The unique identifier", example: 1 })
  id: number;

  @ApiProperty({
    description: "The message content",
    type: MessageContentDto,
  })
  message: MessageContentDto;

  @ApiProperty({ description: "The session ID", example: "session-456" })
  session_id: string;
}
