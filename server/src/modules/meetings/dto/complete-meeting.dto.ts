import { ApiProperty } from "@nestjs/swagger";

import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { TranscriptJsonDto } from "./transcript-segment.dto";

export class CompleteMeetingDto {
  @ApiProperty({
    required: true,
    description: "Meeting duration in minutes",
    example: 30,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  duration_mins: number;

  @ApiProperty({
    required: true,
    description: "Meeting metadata",
    example: { platform: "zoom", recording_id: "123456" },
  })
  @IsNotEmpty()
  meta_data: Record<string, unknown>;

  @ApiProperty({
    required: true,
    description: "Meeting transcript",
    example: "Speaker 1: Hello everyone...",
  })
  @IsNotEmpty()
  @IsString()
  transcript: string;

  @ApiProperty({
    required: true,
    description: "Meeting type ID",
    example: "00295433-ab54-4053-b98c-f0893d13c805",
  })
  @IsNotEmpty()
  @IsUUID()
  meeting_type_id: string;

  @ApiProperty({
    required: true,
    description: "Summary metadata",
    example: { key_points: 5, sentiment: "positive" },
  })
  @IsNotEmpty()
  summary_meta_data: Record<string, unknown>;

  @ApiProperty({
    required: true,
    description: "Meeting summary",
    example: "The team discussed the Q2 roadmap...",
  })
  @IsNotEmpty()
  @IsString()
  summary: string;

  @ApiProperty({
    required: false,
    description:
      "Email summary for participants (if not provided, will use regular summary)",
    example: "Your meeting recording is ready! Here's what was discussed...",
  })
  @IsOptional()
  @IsString()
  email_summary?: string;

  @ApiProperty({
    required: true,
    description: "Meeting chapters",
    example: "Introduction, Main Discussion, Conclusion",
  })
  @IsNotEmpty()
  @IsString()
  chapters: string;

  @ApiProperty({
    required: true,
    description: "Meeting thumbnail URL",
    example:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9MZy0sqolnUkNqRnLoJndQtKADMG3FLNezI3_eXR1-oHJwCJzFdbtITO94qUfDrkU7hI&usqp=CAU",
  })
  @IsNotEmpty()
  @IsString()
  thumbnail: string;

  @ApiProperty({
    required: true,
    description: "Bot ID that processed the meeting",
    example: "bot-123",
  })
  @IsNotEmpty()
  @IsString()
  bot_id: string;

  @ApiProperty({
    required: true,
    description: "Meeting transcript in JSON format",
    type: TranscriptJsonDto,
  })
  @IsNotEmpty()
  transcript_json: TranscriptJsonDto;

  @ApiProperty({
    required: false,
    description: "Host's email address",
    example: "host@example.com",
  })
  @IsOptional()
  @IsEmail()
  host_email?: string;

  @ApiProperty({
    required: false,
    description: "URL of the meeting",
    example: "https://zoom.us/j/123456789",
  })
  @IsOptional()
  @IsString()
  meeting_url?: string;

  @ApiProperty({
    required: false,
    description: "URL of the meeting transcript",
    example: "https://storage.example.com/transcript.txt",
  })
  @IsOptional()
  @IsString()
  transcript_url?: string;

  @ApiProperty({
    required: false,
    description: "Title of the meeting",
    example: "Q2 Planning Meeting",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    required: false,
    description: "URL of the meeting video",
    example: "https://storage.example.com/meeting-video.mp4",
  })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiProperty({
    required: false,
    description: "Date and time of the meeting",
    example: "2024-03-20T10:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  meeting_date?: string;

  @ApiProperty({
    required: false,
    description: "List of participant email addresses",
    example: ["participant1@example.com", "participant2@example.com"],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  participants_email?: string[];
}
