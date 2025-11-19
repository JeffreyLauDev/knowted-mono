import { ApiProperty } from "@nestjs/swagger";

export class AiFeedbackResponseDto {
  @ApiProperty({
    description: "LangSmith feedback ID if successfully created",
    nullable: true,
  })
  langsmith_feedback_id: string | null;

  @ApiProperty({
    description: "Whether feedback was successfully sent to LangSmith",
  })
  success: boolean;

  @ApiProperty({
    description: "Message explaining the result",
  })
  message: string;
}
