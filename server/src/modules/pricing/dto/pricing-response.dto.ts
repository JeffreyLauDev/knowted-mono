import { ApiProperty } from "@nestjs/swagger";

import { PlanTier } from "../entities/pricing-plan.entity";

export class PricingPlanDto {
  @ApiProperty({
    description: "Plan tier",
    enum: PlanTier,
  })
  tier: PlanTier;

  @ApiProperty({
    description: "Plan name",
    example: "Personal",
  })
  name: string;

  @ApiProperty({
    description: "Plan description",
    example: "Perfect for solopreneurs and small teams",
  })
  description: string;

  @ApiProperty({
    description: "Monthly price in USD",
    example: 20.0,
  })
  monthlyPrice: number;

  @ApiProperty({
    description: "Annual price in USD",
    example: 200.0,
  })
  annualPrice: number;

  @ApiProperty({
    description: "Call to action text",
    example: "Get Started",
  })
  cta: string;

  @ApiProperty({
    description: "Maximum number of seats allowed",
    example: 5,
  })
  seatLimit: number;

  @ApiProperty({
    description: "Whether this plan is marked as popular",
    example: false,
  })
  isPopular: boolean;

  @ApiProperty({
    description: "Stripe product ID",
    example: "prod_1234567890",
    nullable: true,
  })
  stripeProductId?: string;

  @ApiProperty({
    description: "Stripe monthly price ID",
    example: "price_1234567890",
    nullable: true,
  })
  stripeMonthlyPriceId?: string;

  @ApiProperty({
    description: "Stripe annual price ID",
    example: "price_0987654321",
    nullable: true,
  })
  stripeAnnualPriceId?: string;
}

export class AddonBundleDto {
  @ApiProperty({
    description: "Bundle name",
    example: "Starter",
  })
  name: string;

  @ApiProperty({
    description: "Bundle price in USD",
    example: 25.0,
  })
  price: number;

  @ApiProperty({
    description: "Number of minutes included",
    example: 2000,
  })
  minutes: number;

  @ApiProperty({
    description: "Bundle tagline",
    example: "Perfect for small teams",
  })
  tagline: string;

  @ApiProperty({
    description: "Sort order for display",
    example: 1,
  })
  sortOrder: number;
}

export class PricingConfigurationDto {
  @ApiProperty({
    description: "All pricing plans",
    type: [PricingPlanDto],
  })
  plans: PricingPlanDto[];

  @ApiProperty({
    description: "All addon bundles",
    type: [AddonBundleDto],
  })
  addonBundles: AddonBundleDto[];

  @ApiProperty({
    description: "Trust features for marketing",
    type: "array",
    items: {
      type: "object",
      properties: {
        icon: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  })
  trustFeatures: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export class PricingConfigurationResponseDto {
  @ApiProperty({
    description: "Pricing configuration data",
    type: PricingConfigurationDto,
  })
  data: PricingConfigurationDto;

  @ApiProperty({
    description: "Last updated timestamp",
    example: "2024-01-15T10:30:00Z",
  })
  lastUpdated: string;
}
