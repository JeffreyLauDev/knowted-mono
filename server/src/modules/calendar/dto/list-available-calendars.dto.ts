import { ApiProperty } from "@nestjs/swagger";

import { IsEnum, IsUUID } from "class-validator";

export type CalendarProvider = "google" | "microsoft";

export class ListAvailableCalendarsDto {
  @ApiProperty({
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: "Calendar provider",
    enum: ["google", "microsoft"],
    example: "google",
  })
  @IsEnum(["google", "microsoft"])
  provider: CalendarProvider;
}
