import { ApiProperty } from "@nestjs/swagger";

export class BillingPortalSessionResponseDto {
  @ApiProperty({
    description: "Billing portal session ID",
    example: "bps_1234567890",
  })
  id: string;

  @ApiProperty({
    description: "URL to the billing portal",
    example: "https://billing.stripe.com/session/bps_1234567890",
  })
  url: string;

  @ApiProperty({
    description: "Customer ID",
    example: "cus_1234567890",
  })
  customer: string;

  @ApiProperty({
    description: "Return URL after portal session",
    example: "https://app.example.com/billing",
  })
  return_url: string;

  @ApiProperty({
    description: "When the session was created",
    example: "2024-01-15T12:00:00.000Z",
  })
  created: number;

  @ApiProperty({
    description: "Whether this is a live mode session",
    example: true,
  })
  livemode: boolean;
}
