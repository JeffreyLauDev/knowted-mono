import { ApiProperty } from "@nestjs/swagger";

import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class AddToLiveMeetingDto {
  @ApiProperty({
    description: "Name of the meeting (optional)",
    example: "Product team sync",
    required: false,
  })
  @IsOptional()
  @IsString()
  meetingName?: string;

  @ApiProperty({
    description: "Meeting link (URL)",
    example: "https://webex.com/example/eg.php?MTID=m475eadfgdycjd8sdv",
    required: true,
  })
  @IsNotEmpty()
  @IsUrl()
  meetingLink: string;

  @ApiProperty({
    description: "Meeting type ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  meetingType: string;

  @ApiProperty({
    description: "Language for the meeting",
    example: "en-US",
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  language: string;
}

export class AddToLiveMeetingResponseDto {
  @ApiProperty({
    description: "Success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
    example: "Successfully added to live meeting",
  })
  message: string;

  @ApiProperty({
    description: "Bot ID created for the meeting",
    example: "12345",
    required: false,
  })
  botId?: string;

  @ApiProperty({
    description: "Meeting ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: false,
  })
  meetingId?: string;
}
