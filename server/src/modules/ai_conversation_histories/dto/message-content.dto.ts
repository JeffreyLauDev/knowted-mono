import { ApiProperty } from "@nestjs/swagger";

export enum MessageContentDtoRole {
  HUMAN = "human",
  AI = "ai",
}

export class MessageContentDto {
  @ApiProperty({
    enum: MessageContentDtoRole,
    description: "The role of the message sender",
    example: MessageContentDtoRole.HUMAN,
  })
  role: MessageContentDtoRole;

  @ApiProperty({
    description: "The content of the message",
    example: "Hello, how are you?",
  })
  content: string;

  @ApiProperty({
    description: "Additional metadata for the message",
    example: {},
    required: false,
  })
  additional_kwargs?: Record<string, unknown>;

  @ApiProperty({
    description: "Response metadata for AI messages",
    example: {},
    required: false,
  })
  response_metadata?: Record<string, unknown>;
}
