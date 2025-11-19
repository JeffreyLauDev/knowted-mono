import { ApiProperty } from "@nestjs/swagger";

export class InvoiceItemDto {
  @ApiProperty({
    description: "Unique identifier for the invoice",
    example: "in_1234567890",
  })
  id: string;

  @ApiProperty({
    description: "Invoice number",
    example: "INV-2024-001",
  })
  number: string;

  @ApiProperty({
    description: "Amount due in cents",
    example: 5000,
  })
  amountDue: number;

  @ApiProperty({
    description: "Amount paid in cents",
    example: 5000,
  })
  amountPaid: number;

  @ApiProperty({
    description: "Invoice status",
    example: "paid",
  })
  status: string;

  @ApiProperty({
    description: "When the invoice was created",
    example: "2024-01-15T12:00:00.000Z",
  })
  created: string;

  @ApiProperty({
    description: "Due date for the invoice",
    example: "2024-02-15T12:00:00.000Z",
    nullable: true,
  })
  dueDate?: number | null;

  @ApiProperty({
    description: "Start of the billing period",
    example: "2024-01-01T00:00:00.000Z",
    nullable: true,
  })
  periodStart?: number | null;

  @ApiProperty({
    description: "End of the billing period",
    example: "2024-01-31T23:59:59.000Z",
    nullable: true,
  })
  periodEnd?: number | null;

  @ApiProperty({
    description: "Associated subscription ID",
    example: "sub_1234567890",
    nullable: true,
  })
  subscriptionId?: string;

  @ApiProperty({
    description: "URL to the PDF invoice",
    example:
      "https://pay.stripe.com/invoice/acct_1234567890/test_YWNjdF8xMjM0NTY3ODkwLF9fX18xMjM0NTY3ODkwLF9fX18xMjM0NTY3ODkw/pdf",
    nullable: true,
  })
  invoicePdf?: string;

  @ApiProperty({
    description: "URL to the hosted invoice page",
    example:
      "https://invoice.stripe.com/i/acct_1234567890/test_YWNjdF8xMjM0NTY3ODkwLF9fX18xMjM0NTY3ODkwLF9fX18xMjM0NTY3ODkw",
    nullable: true,
  })
  hostedInvoiceUrl?: string;

  @ApiProperty({
    description: "Description of the invoice",
    example: "Subscription invoice for Business Plan",
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: "Currency code",
    example: "usd",
  })
  currency: string;

  @ApiProperty({
    description: "Customer email",
    example: "customer@example.com",
    nullable: true,
  })
  customerEmail?: string;

  @ApiProperty({
    description: "Whether this is a live mode invoice",
    example: true,
  })
  livemode: boolean;
}

export class InvoiceResponseDto {
  @ApiProperty({
    description: "List of invoices",
    type: [InvoiceItemDto],
  })
  invoices: InvoiceItemDto[];

  @ApiProperty({
    description: "Total number of invoices returned",
    example: 10,
  })
  total: number;
}
