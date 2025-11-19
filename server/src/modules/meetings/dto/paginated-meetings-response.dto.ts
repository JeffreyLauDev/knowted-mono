import { ApiProperty } from "@nestjs/swagger";

import { MeetingListResponseDto } from "./meeting-list-response.dto";

export class PaginatedMeetingsResponseDto {
  @ApiProperty({
    type: [MeetingListResponseDto],
    description: "Array of meetings",
  })
  data: MeetingListResponseDto[];

  @ApiProperty({ description: "Total number of meetings" })
  total: number;

  @ApiProperty({ description: "Current page number (0-based)" })
  page: number;

  @ApiProperty({ description: "Number of items per page" })
  limit: number;

  @ApiProperty({ description: "Total number of pages" })
  totalPages: number;

  @ApiProperty({ description: "Whether there are more pages" })
  hasNextPage: boolean;

  @ApiProperty({ description: "Whether there are previous pages" })
  hasPreviousPage: boolean;
}
