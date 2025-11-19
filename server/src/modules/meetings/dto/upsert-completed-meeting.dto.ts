import { ApiProperty } from "@nestjs/swagger";

import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { TranscriptJsonDto } from "./transcript-segment.dto";

export class UpsertCompletedMeetingDto {
  @ApiProperty({
    required: false,
    description:
      "Meeting ID for updating existing meeting. If not provided, a new meeting will be created",
    example: "27c7acb2-a046-446e-9b16-847534573117",
  })
  @IsOptional()
  @IsUUID()
  meeting_id?: string;

  @ApiProperty({
    required: true,
    description: "Meeting title",
    example: "Team Standup Meeting",
  })
  @IsString()
  title: string;

  @ApiProperty({
    required: true,
    description: "Meeting date and time (ISO 8601 format)",
    example: "2025-06-05T08:53:32.652Z",
  })
  @IsString()
  @IsISO8601()
  meeting_date: string;

  @ApiProperty({
    required: true,
    description: "Meeting URL",
    example: "https://meet.google.com/abc-defg-hij",
  })
  @IsOptional()
  @IsString()
  meeting_url: string;

  @ApiProperty({
    required: false,
    description: "Host email address",
    example: "host@example.com",
  })
  @IsOptional()
  @IsEmail()
  host_email?: string;

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
    required: false,
    description: "Participants email addresses",
    example: ["participant1@gmail.com", "participant2@gmail.com"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  participants_email?: string[];

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
    required: true,
    description: "Meeting chapters",
    example: "Introduction, Main Discussion, Conclusion",
  })
  @IsNotEmpty()
  @IsString()
  chapters: string;

  @ApiProperty({
    required: false,
    description: "Video URL",
    example: "https://storage.example.com/meeting-recording.mp4",
  })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiProperty({
    required: true,
    description: "Meeting thumbnail URL",
    example: "https://storage.example.com/meeting-thumbnail.jpg",
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
    description: "Transcript URL",
    example: "https://storage.example.com/transcript.txt",
  })
  @IsOptional()
  @IsString()
  transcript_url?: string;

  @ApiProperty({
    required: true,
    description: "Organization ID",
    example: "27c7acb2-a046-446e-9b16-847534573117",
  })
  @IsNotEmpty()
  @IsUUID()
  organization_id: string;
}
