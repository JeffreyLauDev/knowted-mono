import { ApiProperty } from "@nestjs/swagger";

export class MeetingTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  analysis_metadata_structure?: Record<string, string>;
}

export class ReportTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  report_title: string;

  @ApiProperty()
  report_prompt: string;

  @ApiProperty()
  report_schedule: {
    day: string;
    time: string;
    month: string | null;
    frequency: string;
  };

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ nullable: true })
  generation_date: Date | null;

  @ApiProperty({ nullable: true })
  run_at_utc: Date | null;

  @ApiProperty({ type: [MeetingTypeDto], required: false })
  meeting_types?: MeetingTypeDto[];
}
