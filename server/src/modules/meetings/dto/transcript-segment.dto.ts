import { ApiProperty } from "@nestjs/swagger";

export class TranscriptSegmentDto {
  @ApiProperty({
    example: 0.301,
    description: "Start time of the segment in seconds",
    type: Number,
  })
  start: number;

  @ApiProperty({
    example: 0.421,
    description: "End time of the segment in seconds",
    type: Number,
  })
  end: number;

  @ApiProperty({
    example: 0.344,
    description: "Offset time of the segment in seconds",
    type: Number,
  })
  offset: number;

  @ApiProperty({
    example: "Jeffrey Lau",
    description: "Name of the speaker for this segment",
    type: String,
  })
  speaker: string;

  @ApiProperty({
    example: "it",
    description: "The actual conversation text for this segment",
    type: String,
  })
  conversation: string;
}

export class TranscriptJsonDto {
  @ApiProperty({
    type: [TranscriptSegmentDto],
    description: "Array of transcript segments",
  })
  data: TranscriptSegmentDto[];

  @ApiProperty({
    example: "array",
    description: "Type of the data structure",
    type: String,
  })
  type: string;
}
