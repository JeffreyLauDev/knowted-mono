import { ApiProperty } from "@nestjs/swagger";

export class MeetingTypeDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: "Sales Call" })
  name: string;
}

export class TeamDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: "Engineering Team" })
  name: string;
}

export class MeetingListResponseDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;

  @ApiProperty({ example: true })
  analysed: boolean;

  @ApiProperty({ example: 30 })
  duration_mins: number;

  @ApiProperty({ example: "host@example.com" })
  host_email: string;

  @ApiProperty({ example: "2024-03-20T10:00:00Z" })
  meeting_date: Date;

  @ApiProperty({ example: "https://zoom.us/j/123456789" })
  meeting_url: string;

  @ApiProperty({ example: "2024-03-20T10:00:00Z" })
  created_at: Date;

  @ApiProperty({
    example: ["participant1@example.com", "participant2@example.com"],
    type: [String],
  })
  participants_email: string[];

  @ApiProperty({
    example: "https://storage.example.com/meeting-thumbnail.jpg",
  })
  thumbnail: string;

  @ApiProperty({ example: "Q2 Planning Meeting" })
  title: string;

  @ApiProperty({
    example: "completed",
    description: "Status of video processing",
    enum: ["none", "processing", "completed", "failed"],
  })
  video_processing_status: "none" | "processing" | "completed" | "failed";

  @ApiProperty({
    type: MeetingTypeDto,
    description: "Associated meeting type information",
  })
  meetingType: MeetingTypeDto;

  @ApiProperty({
    type: TeamDto,
    description: "Associated team information",
    required: false,
  })
  team?: TeamDto;
}
