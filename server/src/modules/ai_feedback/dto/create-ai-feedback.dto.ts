import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum FeedbackType {
  THUMBS_UP = "thumbs_up",
  THUMBS_DOWN = "thumbs_down",
}

export class CreateAiFeedbackDto {
  @ApiProperty({
    description: "The message ID that this feedback is for",
    example: "msg_123",
  })
  @IsString()
  @IsNotEmpty()
  message_id: string;

  @ApiProperty({
    description: "The LangGraph thread ID",
    example: "thread_123",
  })
  @IsString()
  @IsNotEmpty()
  thread_id: string;

  @ApiProperty({
    description: "Type of feedback",
    enum: FeedbackType,
    example: FeedbackType.THUMBS_UP,
  })
  @IsEnum(FeedbackType)
  @IsNotEmpty()
  type: FeedbackType;

  @ApiPropertyOptional({
    description: "Issue type for negative feedback",
    example: "Incorrect information",
  })
  @IsString()
  @IsOptional()
  issue_type?: string;

  @ApiPropertyOptional({
    description: "Comment or details about the feedback",
    example: "The response was helpful and accurate",
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: "Correction details for the feedback",
    example: "The correct answer should be...",
  })
  @IsString()
  @IsOptional()
  correction?: string;
}
