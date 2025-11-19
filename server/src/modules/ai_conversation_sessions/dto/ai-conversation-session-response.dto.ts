import { ApiProperty } from "@nestjs/swagger";

export class AiConversationSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  created_at: Date;
}
