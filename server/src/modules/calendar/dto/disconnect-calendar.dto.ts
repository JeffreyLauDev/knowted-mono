import { ApiProperty } from "@nestjs/swagger";

export class DisconnectCalendarResponseDto {
  @ApiProperty({
    description: "Whether the operation was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
    example: "Google calendar disconnected successfully",
  })
  message: string;

  @ApiProperty({
    description: "The calendar provider that was disconnected",
    enum: ["google", "microsoft"],
    example: "google",
  })
  provider: "google" | "microsoft";
}
