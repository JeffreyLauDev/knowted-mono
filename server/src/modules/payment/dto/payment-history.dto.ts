import { ApiProperty } from "@nestjs/swagger";

export class PaymentHistoryItemDto {
  @ApiProperty({
    description: "Unique identifier for the payment",
    example: "pi_1234567890",
  })
  id: string;

  @ApiProperty({
    description: "Payment amount in cents",
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: "Currency code",
    example: "usd",
  })
  currency: string;

  @ApiProperty({
    description: "Payment status",
    example: "succeeded",
  })
  status: string;

  @ApiProperty({
    description: "When the payment was created",
    example: "2024-01-15T12:00:00.000Z",
  })
  created: string;

  @ApiProperty({
    description: "Payment method used",
    example: "pm_1234567890",
    nullable: true,
  })
  paymentMethod?: string;

  @ApiProperty({
    description: "Description of the payment",
    example: "Subscription payment for Business Plan",
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: "Customer email",
    example: "customer@example.com",
    nullable: true,
  })
  customerEmail?: string;

  @ApiProperty({
    description: "Whether this is a live mode payment",
    example: true,
  })
  livemode: boolean;
}

export class PaymentHistoryResponseDto {
  @ApiProperty({
    description: "List of payment history items",
    type: [PaymentHistoryItemDto],
  })
  payments: PaymentHistoryItemDto[];

  @ApiProperty({
    description: "Total number of payments returned",
    example: 10,
  })
  total: number;
}
