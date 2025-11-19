import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: "Organization ID to create checkout session for",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  organizationId: string;

  @ApiProperty({
    description: "Plan tier to subscribe to",
    example: "personal",
    enum: ["personal", "business", "company"],
  })
  @IsString()
  planTier: string;

  @ApiProperty({
    description: "Number of seats",
    example: 1,
  })
  @IsNumber()
  @Min(1)
  seatsCount: number;

  @ApiProperty({
    description: "Billing cycle",
    example: "month",
    enum: ["month", "year"],
  })
  @IsString()
  billingCycle: string;
}

export class CreateFreeTrialCheckoutSessionDto {
  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  organizationId: string;

  @ApiProperty({
    description: "Customer email",
    example: "customer@example.com",
  })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({
    description: "Customer name",
    example: "John Doe",
  })
  @IsString()
  customerName: string;

  @ApiProperty({
    description: "Number of seats",
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  seatsCount?: number;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({
    description: "Stripe checkout session ID",
    example: "cs_1234567890",
  })
  sessionId: string;

  @ApiProperty({
    description: "URL to redirect customer for payment",
    example: "https://checkout.stripe.com/pay/cs_1234567890",
  })
  url: string;

  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  organizationId: string;

  @ApiProperty({
    description: "Plan name",
    example: "Personal",
  })
  planName: string;

  @ApiProperty({
    description: "Number of seats",
    example: 1,
  })
  seatsCount: number;

  @ApiProperty({
    description: "Billing cycle",
    example: "month",
    enum: ["month", "year"],
  })
  billingCycle: string;
}

export class FreeTrialCheckoutSessionResponseDto {
  @ApiProperty({
    description: "Stripe checkout session ID",
    example: "cs_1234567890",
  })
  sessionId: string;

  @ApiProperty({
    description: "URL to redirect customer for payment",
    example: "https://checkout.stripe.com/pay/cs_1234567890",
  })
  url: string;

  @ApiProperty({
    description: "Organization ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  organizationId: string;

  @ApiProperty({
    description: "Number of trial days",
    example: 30,
  })
  trialDays: number;
}
