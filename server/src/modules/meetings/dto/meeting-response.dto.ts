import { ApiProperty } from "@nestjs/swagger";

import { MeetingTypeDto } from "./meeting-list-response.dto";
import { TranscriptJsonDto } from "./transcript-segment.dto";

export class MeetingResponseDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: true })
  analysed: boolean;

  @ApiProperty({ example: "bot-123" })
  bot_id: string;

  @ApiProperty({ example: "Introduction, Main Discussion, Conclusion" })
  chapters: string;

  @ApiProperty({ example: 30 })
  duration_mins: number;

  @ApiProperty({ example: "host@example.com" })
  host_email: string;

  @ApiProperty({ example: "2024-03-20T10:00:00Z" })
  meeting_date: Date;

  @ApiProperty({ example: "https://zoom.us/j/123456789" })
  meeting_url: string;

  @ApiProperty({
    example: { platform: "zoom", recording_id: "123456" },
    description: "Additional metadata about the meeting",
  })
  meta_data: Record<string, unknown>;

  @ApiProperty({
    example: ["participant1@example.com", "participant2@example.com"],
    type: [String],
  })
  participants_email: string[];

  @ApiProperty({ example: "The team discussed the Q2 roadmap..." })
  summary: string;

  @ApiProperty({
    example: { key_points: 5, sentiment: "positive" },
    description: "Metadata about the meeting summary",
  })
  summary_meta_data: Record<string, unknown>;

  @ApiProperty({
    example: "https://storage.example.com/meeting-thumbnail.jpg",
  })
  thumbnail: string;

  @ApiProperty({ example: "Q2 Planning Meeting" })
  title: string;

  @ApiProperty({
    example: "Speaker 1: Hello everyone...",
    description: "Full meeting transcript text",
  })
  transcript: string;

  @ApiProperty({
    type: TranscriptJsonDto,
    description: "Structured transcript data in JSON format",
  })
  transcript_json: TranscriptJsonDto;

  @ApiProperty({
    example: "https://storage.example.com/transcript.txt",
    description: "URL to the transcript file",
  })
  transcript_url: string;

  @ApiProperty({
    example: "https://storage.example.com/meeting-video.mp4",
  })
  video_url: string;

  @ApiProperty({
    example: "completed",
    description: "Status of video processing",
    enum: ["none", "processing", "completed", "failed"],
  })
  video_processing_status: "none" | "processing" | "completed" | "failed";

  @ApiProperty({ example: "user-123" })
  user_id: string;

  @ApiProperty({ example: "2024-03-20T10:00:00Z" })
  created_at: Date;

  @ApiProperty({ example: "2024-03-20T10:00:00Z" })
  updated_at: Date;

  @ApiProperty({
    type: MeetingTypeDto,
    description: "Associated meeting type information",
  })
  meetingType: MeetingTypeDto;

  @ApiProperty({
    example: { id: "org-123" },
    description: "Organization reference",
  })
  organization: { id: string };
}
