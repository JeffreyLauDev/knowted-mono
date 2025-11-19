import { ApiProperty } from "@nestjs/swagger";

export class CustomerAddressDto {
  @ApiProperty({
    description: "Address line 1",
    example: "123 Main St",
    nullable: true,
  })
  line1?: string;

  @ApiProperty({
    description: "Address line 2",
    example: "Apt 4B",
    nullable: true,
  })
  line2?: string;

  @ApiProperty({
    description: "City",
    example: "New York",
    nullable: true,
  })
  city?: string;

  @ApiProperty({
    description: "State or province",
    example: "NY",
    nullable: true,
  })
  state?: string;

  @ApiProperty({
    description: "Postal code",
    example: "10001",
    nullable: true,
  })
  postal_code?: string;

  @ApiProperty({
    description: "Country",
    example: "US",
    nullable: true,
  })
  country?: string;
}

export class CustomerDetailsDto {
  @ApiProperty({
    description: "Unique identifier for the customer",
    example: "cus_1234567890",
  })
  id: string;

  @ApiProperty({
    description: "Customer email address",
    example: "customer@example.com",
  })
  email: string;

  @ApiProperty({
    description: "Customer name",
    example: "John Doe",
    nullable: true,
  })
  name?: string;

  @ApiProperty({
    description: "Customer phone number",
    example: "+1234567890",
    nullable: true,
  })
  phone?: string;

  @ApiProperty({
    description: "Customer address",
    type: CustomerAddressDto,
    nullable: true,
  })
  address?: CustomerAddressDto;

  @ApiProperty({
    description: "When the customer was created",
    example: "2024-01-01T00:00:00.000Z",
  })
  created: string;

  @ApiProperty({
    description: "Whether this is a live mode customer",
    example: true,
  })
  livemode: boolean;

  @ApiProperty({
    description: "Customer metadata",
    example: { organization_id: "org_123" },
    nullable: true,
  })
  metadata?: Record<string, string>;

  @ApiProperty({
    description: "Default payment method ID",
    example: "pm_1234567890",
    nullable: true,
  })
  defaultPaymentMethod?: string;

  @ApiProperty({
    description: "Customer description",
    example: "Business customer",
    nullable: true,
  })
  description?: string;
}
