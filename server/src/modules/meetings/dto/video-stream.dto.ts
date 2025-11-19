import { ApiProperty } from "@nestjs/swagger";

export class VideoStreamResponseDto {
  @ApiProperty({
    example: "https://example.com/video-stream/123?format=hls&quality=720p",
    description: "URL for video streaming",
    type: String,
  })
  streamUrl: string;

  @ApiProperty({
    example: "hls",
    description: "Streaming format (hls, dash, progressive)",
    type: String,
    enum: ["hls", "dash", "progressive"],
  })
  format: string;

  @ApiProperty({
    example: "720p",
    description: "Video quality",
    type: String,
    enum: ["1080p", "720p", "480p", "360p"],
  })
  quality: string;

  @ApiProperty({
    example: 3600,
    description: "URL expiration time in seconds",
    type: Number,
  })
  expiresIn: number;
}
