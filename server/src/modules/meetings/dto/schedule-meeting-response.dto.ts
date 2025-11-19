import { ApiProperty } from "@nestjs/swagger";

export class ScheduleMeetingResponseDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The ID of the newly created meeting",
  })
  id: string;
}
