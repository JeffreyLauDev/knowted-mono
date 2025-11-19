import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import Stripe from "stripe";
import { Repository } from "typeorm";

import {
  OrganizationSubscription,
  SubscriptionStatus,
} from "../organization-subscriptions/entities/organization-subscription.entity";
import { ImmutableSubscriptionService } from "../organization-subscriptions/immutable-subscription.service";
import { OrganizationSubscriptionsService } from "../organization-subscriptions/organization-subscriptions.service";
import { Organizations } from "../organizations/entities/organizations.entity";
import { OrganizationsService } from "../organizations/organizations.service";
import { PlanTier, PricingPlan } from "../pricing/entities/pricing-plan.entity";
import { PricingService } from "../pricing/pricing.service";
import {
  SeatManagementService,
  SeatUpgradeRecommendation,
  SeatValidationResult,
} from "../seat-management/seat-management.service";
import { UsageEventsService } from "../usage-events/usage-events.service";

import { CurrentPlanDto, CurrentPlanFeatureDto } from "./dto/current-plan.dto";

// Type aliases for webhook handling
type StripeInvoiceWithPaymentIntent = Stripe.Invoice & {
  payment_intent?: string;
  subscription?: string;
  charge?: string;
};

type StripeChargeWithPaymentIntent = Stripe.Charge & {
  payment_intent?: string;
  invoice?: string;
};

type StripeCustomerWithMetadata = Stripe.Customer & {
  metadata?: {
    organization_id?: string;
  };
};

type StripeSubscriptionWithDates = Stripe.Subscription & {
  trial_start?: number;
  trial_end?: number;
  current_period_start?: number;
  current_period_end?: number;
};

// Interface for subscription details response
export interface SubscriptionDetailsResponse {
  hasSubscription: boolean;
  activeSubscription?: OrganizationSubscription | null;
  allSubscriptions?: OrganizationSubscription[];
  subscriptionCount?: number;
  message?: string;
}

// Interface for subscription status response
export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  status?: SubscriptionStatus | null;
  isActive: boolean;
  isTrial: boolean;
  isPastDue?: boolean;
  seatsCount?: number;
  planId?: string;
  subscriptionId?: string;
  pricingPlan?: {
    id: string;
    tier: PlanTier;
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    cta: string;
    seatLimit: number;
    isPopular: boolean;
    isActive: boolean;
    stripeProductId: string;
    stripeMonthlyPriceId: string;
    stripeAnnualPriceId: string;
  } | null;
}

export enum BillingCycle {
  MONTHLY = "month",
  YEARLY = "year",
}

// Configuration for existing Stripe products
export interface PaymentProductConfig {
  planName: string;
  productId: string;
  priceId: string;
  pricePerSeat: number;
  billingCycle: BillingCycle;
  description?: string;
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  // Simple configuration with just 3 product IDs
  private readonly productIds = {
    personal: process.env.STRIPE_PERSONAL_PRODUCT_ID || "prod_ScLH1s8l9Ult24",
    business: process.env.STRIPE_BUSINESS_PRODUCT_ID || "prod_ScLIFZ7DSV0FLW",
    company: process.env.STRIPE_COMPANY_PRODUCT_ID || "prod_ScLIPLXmhfwive",
  };

  // Cache for product configurations
  private productConfigCache: Record<string, PaymentProductConfig> = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly orgSubscriptionsService: OrganizationSubscriptionsService,
    private readonly immutableSubscriptionService: ImmutableSubscriptionService,
    private readonly organizationsService: OrganizationsService,
    @InjectRepository(OrganizationSubscription)
    private readonly orgSubRepo: Repository<OrganizationSubscription>,
    @InjectRepository(Organizations)
    private readonly organizationsRepo: Repository<Organizations>,
    @InjectRepository(PricingPlan)
    private readonly pricingPlanRepo: Repository<PricingPlan>,

    private readonly pricingService: PricingService,
    private readonly seatManagementService: SeatManagementService,
    private readonly usageEventsService: UsageEventsService,
  ) {
    const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-07-30.basil",
    });
  }

  /**
   * Create a payment customer for an organization
   */
  async createCustomer(
    organizationId: string,
    email: string,
    name: string,
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          organization_id: organizationId,
        },
      });

      this.logger.log(
        `Created payment customer ${customer.id} for organization ${organizationId}`,
      );
      return customer;
    } catch (error) {
      this.logger.error(
        `Failed to create payment customer for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to create customer");
    }
  }

  /**
   * Create a payment product and price for a subscription plan
   */
  async createProductAndPrice(
    planId: string,
    planName: string,
    pricePerSeat: number,
    billingCycle: BillingCycle,
  ): Promise<{ productId: string; priceId: string }> {
    try {
      // Create product
      const product = await this.stripe.products.create({
        name: planName,
        description: `Knowted ${planName} Plan`,
        metadata: {
          plan_id: planId,
        },
      });

      // Create price
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(pricePerSeat * 100), // Convert to cents
        currency: "usd",
        recurring: {
          interval: billingCycle === BillingCycle.MONTHLY ? "month" : "year",
        },
        metadata: {
          plan_id: planId,
          price_per_seat: pricePerSeat.toString(),
        },
      });

      this.logger.log(
        `Created payment product ${product.id} and price ${price.id} for plan ${planId}`,
      );
      return { productId: product.id, priceId: price.id };
    } catch (error) {
      this.logger.error(
        `Failed to create payment product/price for plan ${planId}:`,
        error,
      );
      throw new BadRequestException("Failed to create product and price");
    }
  }

  /**
   * Create a subscription for an organization
   */
  async createSubscription(
    organizationId: string,
    planId: string,
    seatsCount: number,
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: priceId,
            quantity: seatsCount,
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          organization_id: organizationId,
          plan_id: planId,
        },
      });

      this.logger.log(
        `Created payment subscription ${subscription.id} for organization ${organizationId}`,
      );
      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to create payment subscription for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to create subscription");
    }
  }

  /**
   * Update subscription quantity (seats) and/or plan
   */
  async updateSubscriptionQuantity(
    subscriptionId: string,
    seatsCount: number,
    tier: string,
    billingCycle: string,
  ): Promise<StripeSubscriptionWithDates> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      // Check if subscription can be updated in Stripe
      // Note: We allow most updates since we create immutable records anyway
      if (!this.canSubscriptionBeUpdated(subscription.status)) {
        const suggestion = this.getSubscriptionUpdateSuggestion(
          subscription.status,
        );
        throw new BadRequestException(
          `Cannot update subscription with status '${subscription.status}'. ${suggestion}`,
        );
      }

      const item = subscription.items.data[0];

      // Validate and get pricing plan
      const pricingPlan = await this.validateAndGetPricingPlan(tier);

      // Get price information
      const { priceId, pricePerSeat } = this.getPriceInfo(
        pricingPlan,
        billingCycle,
      );

      // Validate seat count
      this.validateSeatCountAgainstPlan(
        seatsCount,
        pricingPlan.seatLimit,
        tier,
      );

      // Prepare update parameters
      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [
          {
            id: item.id,
            price: priceId,
            quantity: seatsCount,
          },
        ],
        metadata: this.buildSubscriptionMetadata(
          subscription.metadata,
          seatsCount,
          tier,
          billingCycle,
          pricingPlan,
          pricePerSeat,
          priceId,
        ),
      };

      let updatedSubscription: StripeSubscriptionWithDates;
      let stripeError: any = null;

      // Get the current subscription, but also check for any subscription with this Stripe ID
      // This handles cases where the subscription was cancelled but user wants to reactivate
      let currentSubscription = await this.orgSubRepo.findOne({
        where: { stripe_subscription_id: subscriptionId, is_current: true },
      });

      // If no current subscription found, look for any subscription with this Stripe ID
      if (!currentSubscription) {
        currentSubscription = await this.orgSubRepo.findOne({
          where: { stripe_subscription_id: subscriptionId },
          order: { created_at: "DESC" },
        });

        if (currentSubscription) {
          this.logger.log(
            `Found previous subscription ${currentSubscription.id} (status: ${currentSubscription.status}) for Stripe subscription ${subscriptionId}`,
            "PaymentService",
          );
        }
      }

      // If still no subscription found, we need to get organization info from somewhere else
      if (!currentSubscription) {
        // Try to get organization ID from the Stripe subscription metadata
        const orgId = subscription.metadata?.organization_id;
        if (orgId) {
          // Create a minimal current subscription object for the immutable record
          currentSubscription = {
            organization_id: orgId,
            stripe_customer_id: subscription.customer as string,
          } as any;
          this.logger.log(
            `Using organization ID ${orgId} from Stripe metadata for new subscription`,
            "PaymentService",
          );
        } else {
          throw new BadRequestException(
            "Unable to determine organization for subscription update. Please contact support.",
          );
        }
      }

      try {
        // Try to update the existing Stripe subscription
        updatedSubscription = (await this.stripe.subscriptions.update(
          subscriptionId,
          updateParams,
        )) as StripeSubscriptionWithDates;

        this.logger.log(
          `Successfully updated Stripe subscription ${subscriptionId}`,
          "PaymentService",
        );
      } catch (error) {
        stripeError = error;
        // If Stripe update fails (e.g., incomplete_expired status), create a new subscription
        if (
          error.message?.includes("incomplete_expired") ||
          error.message?.includes("cannot update")
        ) {
          this.logger.log(
            `Stripe subscription ${subscriptionId} cannot be updated,  creating new subscription instead`,
            "PaymentService",
          );

          // Get a valid customer ID for the organization
          let validCustomerId = subscription.customer as string;

          try {
            // Verify the customer exists in Stripe
            await this.stripe.customers.retrieve(validCustomerId);
            this.logger.log(
              `Using existing customer ${validCustomerId} for new subscription`,
              "PaymentService",
            );
          } catch (customerError) {
            // Customer doesn't exist, try to get from organization
            if (currentSubscription?.organization_id) {
              try {
                const organization = await this.organizationsService.findOne(
                  currentSubscription.organization_id,
                );
                if (organization?.stripe_customer_id) {
                  // Try the organization's customer ID
                  await this.stripe.customers.retrieve(
                    organization.stripe_customer_id,
                  );
                  validCustomerId = organization.stripe_customer_id;
                  this.logger.log(
                    `Using organization customer ${validCustomerId} for new subscription`,
                    "PaymentService",
                  );
                } else {
                  // Create new customer for organization
                  const newCustomer = await this.createCustomer(
                    currentSubscription.organization_id,
                    organization?.owner?.email || "admin@organization.com",
                    organization?.name || "Organization",
                  );
                  validCustomerId = newCustomer.id;
                  this.logger.log(
                    `Created new customer ${validCustomerId} for organization ${currentSubscription.organization_id}`,
                    "PaymentService",
                  );
                }
              } catch (orgError) {
                this.logger.error(
                  `Failed to get/create customer for organization ${currentSubscription.organization_id}:`,
                  orgError,
                );
                throw new BadRequestException(
                  "Unable to create new subscription: customer creation failed",
                );
              }
            } else {
              throw new BadRequestException(
                "Unable to create new subscription: no valid customer found",
              );
            }
          }

          // Create new subscription with valid customer
          const newSubscription = await this.stripe.subscriptions.create({
            customer: validCustomerId,
            items: [{ price: priceId, quantity: seatsCount }],
            metadata: updateParams.metadata,
            payment_behavior: "default_incomplete",
            expand: ["latest_invoice.payment_intent"],
          });

          updatedSubscription = newSubscription as StripeSubscriptionWithDates;

          this.logger.log(
            `Created new Stripe subscription ${newSubscription.id} to replace ${subscriptionId}`,
            "PaymentService",
          );
        } else {
          // Re-throw other Stripe errors
          throw error;
        }
      }

      // Create new immutable record in our database
      if (currentSubscription) {
        await this.immutableSubscriptionService.createSubscriptionRecord(
          {
            organization_id: currentSubscription.organization_id,
            stripe_subscription_id: updatedSubscription.id, // Use new subscription ID if created
            seats_count: seatsCount,
            stripe_plan_id: `${tier}_${billingCycle}`,
            stripe_product_id: pricingPlan.stripeProductId,
            status: updatedSubscription.status as any,
            stripe_customer_id: currentSubscription.stripe_customer_id,
            stripe_price_id: priceId,
            stripe_metadata: updateParams.metadata as any,
          },
          `Subscription ${stripeError ? "replaced" : "updated"}: seats changed to ${seatsCount}, plan changed to ${tier}_${billingCycle}`,
          {
            previous_seats_count: currentSubscription.seats_count,
            previous_plan_id: currentSubscription.stripe_plan_id,
            new_seats_count: seatsCount,
            new_plan_id: `${tier}_${billingCycle}`,
            stripe_error: stripeError ? stripeError.message : null,
            new_stripe_subscription_id: updatedSubscription.id,
          },
        );
      }

      this.logger.log(
        `Updated Stripe subscription ${subscriptionId} and local database - seats: ${seatsCount}, tier: ${tier}, billing: ${billingCycle}`,
      );
      return updatedSubscription;
    } catch (error) {
      this.logger.error(
        `Failed to update subscription ${subscriptionId}:`,
        error,
      );

      // If it's already a BadRequestException, re-throw it to preserve the specific message
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw a generic message
      throw new BadRequestException("Failed to update subscription");
    }
  }

  private async validateAndGetPricingPlan(tier: string): Promise<PricingPlan> {
    const pricingPlan = await this.pricingPlanRepo.findOne({
      where: { tier: tier as PlanTier },
    });

    if (!pricingPlan) {
      throw new BadRequestException(`Pricing plan with tier ${tier} not found`);
    }

    if (!pricingPlan.isActive) {
      throw new BadRequestException(`Pricing plan ${tier} is not active`);
    }

    return pricingPlan;
  }

  private getPriceInfo(
    pricingPlan: PricingPlan,
    billingCycle: string,
  ): { priceId: string; pricePerSeat: number } {
    let priceId: string;
    let pricePerSeat: number;

    // Normalize billing cycle to handle both "monthly"/"yearly" and "month"/"year"
    const normalizedBillingCycle = this.normalizeBillingCycle(billingCycle);

    if (normalizedBillingCycle === BillingCycle.MONTHLY) {
      priceId = pricingPlan.stripeMonthlyPriceId;
      pricePerSeat = Number(pricingPlan.monthlyPrice);
    } else if (normalizedBillingCycle === BillingCycle.YEARLY) {
      priceId = pricingPlan.stripeAnnualPriceId;
      pricePerSeat = Number(pricingPlan.annualPrice);
    } else {
      throw new BadRequestException(
        `Invalid billing cycle: ${billingCycle}. Must be 'monthly'/'month' or 'yearly'/'year'`,
      );
    }

    if (!priceId) {
      throw new BadRequestException(
        `Stripe price ID not configured for ${pricingPlan.tier} plan with ${billingCycle} billing`,
      );
    }

    return { priceId, pricePerSeat };
  }

  private normalizeBillingCycle(billingCycle: string): BillingCycle {
    const normalized = billingCycle.toLowerCase();

    if (normalized === "monthly" || normalized === "month") {
      return BillingCycle.MONTHLY;
    } else if (normalized === "yearly" || normalized === "year") {
      return BillingCycle.YEARLY;
    }

    throw new BadRequestException(
      `Invalid billing cycle: ${billingCycle}. Must be 'monthly'/'month' or 'yearly'/'year'`,
    );
  }

  private validateSeatCountAgainstPlan(
    seatsCount: number,
    seatLimit: number,
    tier: string,
  ): void {
    if (seatsCount > seatLimit) {
      throw new BadRequestException(
        `Requested ${seatsCount} seats exceeds the limit of ${seatLimit} seats for ${tier} plan`,
      );
    }
  }

  private buildSubscriptionMetadata(
    existingMetadata: Stripe.MetadataParam,
    seatsCount: number,
    tier: string,
    billingCycle: string,
    pricingPlan: PricingPlan,
    pricePerSeat: number,
    priceId: string,
  ): Stripe.MetadataParam {
    return {
      ...existingMetadata,
      seats_count: seatsCount.toString(),
      plan_id: tier,
      billing_cycle: billingCycle,
      plan_name: pricingPlan.name,
      plan_description: pricingPlan.description,
      price_per_seat: pricePerSeat.toString(),
      seat_limit: pricingPlan.seatLimit.toString(),
      stripe_product_id: pricingPlan.stripeProductId,
      stripe_price_id: priceId,
    };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription =
        await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(
        `Cancelled Stripe subscription ${subscriptionId}`,
        "PaymentService",
      );
      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}:`,
        error,
      );

      // If it's already a BadRequestException, re-throw it to preserve the specific message
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw a generic message
      throw new BadRequestException("Failed to cancel subscription");
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      if (subscription.status !== "canceled") {
        throw new BadRequestException("Subscription is not cancelled");
      }

      // Reactivate by updating the subscription
      const reactivatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: false },
      );

      this.logger.log(
        `Reactivated Stripe subscription ${subscriptionId}`,
        "PaymentService",
      );
      return reactivatedSubscription;
    } catch (error) {
      this.logger.error(
        `Failed to reactivate subscription ${subscriptionId}:`,
        error,
      );

      // If it's already a BadRequestException, re-throw it to preserve the specific message
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw a generic message
      throw new BadRequestException("Failed to reactivate subscription");
    }
  }

  /**
   * Create a checkout session using existing Stripe products
   */
  async createCheckoutSessionWithExistingProduct(
    organizationId: string,
    planKey: string,
    seatsCount: number,
    successUrl: string,
    cancelUrl: string,
    trialDays?: number,
    customerEmail?: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      // Get existing product configuration
      const productConfig = await this.getProductConfig(planKey);

      // Verify organization exists
      const organization =
        await this.organizationsService.findOne(organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization ${organizationId} not found`);
      }

      // Use provided email or fallback to organization owner's email
      const email = customerEmail || organization.owner?.email;
      if (!email) {
        throw new BadRequestException(
          "No customer email provided and organization owner email is missing.",
        );
      }

      // Create or get customer by email
      let customer = await this.getCustomerByEmail(email);
      if (!customer) {
        customer = await this.createCustomer(
          organizationId,
          email,
          organization.name || "Organization",
        );
      }

      // Prepare checkout session parameters
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: productConfig.priceId,
            quantity: seatsCount,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: organizationId,
        allow_promotion_codes: true, // Enable coupon/promotion code support
        metadata: {
          organization_id: organizationId,
          plan_name: productConfig.planName,
          plan_id: planKey,
          price_per_seat: productConfig.pricePerSeat.toString(),
          billing_cycle: productConfig.billingCycle,
          seats_count: seatsCount.toString(),
        },
        subscription_data: {
          metadata: {
            organization_id: organizationId,
            plan_name: productConfig.planName,
            plan_id: planKey,
            price_per_seat: productConfig.pricePerSeat.toString(),
            billing_cycle: productConfig.billingCycle,
            seats_count: seatsCount.toString(),
          },
          // Don't set trial_period_days to ensure no trial is applied
        },
      };

      // Add trial period if specified
      if (trialDays && trialDays > 0) {
        sessionParams.subscription_data.trial_period_days = trialDays;
        sessionParams.metadata.trial_days = trialDays.toString();
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(
        `Created Stripe checkout session ${session.id} for organization ${organizationId} using existing product ${productConfig.productId} with promotion codes enabled`,
      );

      return session;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe checkout session for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to create checkout session");
    }
  }

  /**
   * Create a checkout session for subscription (updated to use existing products)
   */
  async createCheckoutSession(
    organizationId: string,
    planName: string,
    pricePerSeat: number,
    billingCycle: BillingCycle,
    seatsCount: number,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
  ): Promise<Stripe.Checkout.Session> {
    // Map plan name and billing cycle to plan key
    const planKey = `${planName.toLowerCase().replace(/\s+/g, "_")}_${billingCycle}`;

    try {
      return await this.createCheckoutSessionWithExistingProduct(
        organizationId,
        planKey,
        seatsCount,
        successUrl,
        cancelUrl,
        undefined, // trialDays
        customerEmail,
      );
    } catch (error) {
      // Fallback to creating product if not found
      this.logger.warn(
        `Plan ${planKey} not found in configuration, falling back to dynamic product creation`,
      );
      return this.createCheckoutSessionLegacy(
        organizationId,
        planName,
        pricePerSeat,
        billingCycle,
        seatsCount,
        successUrl,
        cancelUrl,
        customerEmail,
      );
    }
  }

  /**
   * Legacy method for creating checkout session with dynamic product creation
   */
  private async createCheckoutSessionLegacy(
    organizationId: string,
    planName: string,
    pricePerSeat: number,
    billingCycle: BillingCycle,
    seatsCount: number,
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const organization =
        await this.organizationsService.findOne(organizationId);

      // Use provided email or fallback to organization owner's email
      const email = customerEmail || organization.owner?.email;
      if (!email) {
        throw new BadRequestException(
          "No customer email provided and organization owner email is missing.",
        );
      }

      // Create or get customer by email
      let customer = await this.getCustomerByEmail(email);
      if (!customer) {
        customer = await this.createCustomer(
          organizationId,
          email,
          organization.name || "Organization",
        );
      }

      // Create product and price
      const { priceId } = await this.createProductAndPrice(
        planName,
        planName,
        pricePerSeat,
        billingCycle,
      );

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: seatsCount,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: organizationId,
        metadata: {
          organization_id: organizationId,
          plan_name: planName,
          price_per_seat: pricePerSeat.toString(),
          billing_cycle: billingCycle,
          seats_count: seatsCount.toString(),
        },
        subscription_data: {
          // Don't set trial_period_days to ensure no trial is applied
        },
      });

      this.logger.log(
        `Created Stripe checkout session ${session.id} for organization ${organizationId} using dynamic product creation`,
      );
      return session;
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe checkout session for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to create checkout session");
    }
  }

  /**
   * Create an enhanced checkout session with trial support and better organization metadata
   */
  async createEnhancedCheckoutSession(createEnhancedCheckoutSessionDto: {
    organizationId: string;
    planName: string;
    pricePerSeat: number;
    billingCycle: string;
    seatsCount: number;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    customerEmail?: string;
    customerName?: string;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const {
        organizationId,
        planName,
        pricePerSeat,
        billingCycle,
        seatsCount,
        successUrl,
        cancelUrl,
        trialDays,
        customerEmail,
        customerName,
      } = createEnhancedCheckoutSessionDto;

      // Verify organization exists
      const organization =
        await this.organizationsService.findOne(organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization ${organizationId} not found`);
      }

      // Use provided email or fallback to organization owner's email
      const email = customerEmail || organization.owner?.email;
      if (!email) {
        throw new BadRequestException(
          "No customer email provided and organization owner email is missing.",
        );
      }

      // Create or get customer by email
      let customer = await this.getCustomerByEmail(email);
      if (!customer) {
        customer = await this.createCustomer(
          organizationId,
          email,
          customerName || organization.name || "Organization",
        );
      }

      // Create product and price if they don't exist
      const planId = `${planName}_${billingCycle}`;
      const { priceId } = await this.createProductAndPrice(
        planId,
        planName,
        pricePerSeat,
        billingCycle as BillingCycle,
      );

      // Prepare checkout session parameters
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: seatsCount,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: organizationId,
        allow_promotion_codes: true, // Enable coupon/promotion code support
        metadata: {
          organization_id: organizationId,
          plan_name: planName,
          plan_id: planId,
          price_per_seat: pricePerSeat.toString(),
          billing_cycle: billingCycle,
          seats_count: seatsCount.toString(),
        },
        subscription_data: {
          metadata: {
            organization_id: organizationId,
            plan_name: planName,
            plan_id: planId,
            price_per_seat: pricePerSeat.toString(),
            billing_cycle: billingCycle,
            seats_count: seatsCount.toString(),
          },
        },
      };

      // Add trial period if specified, otherwise don't set it (no trial)
      if (trialDays && trialDays > 0) {
        sessionParams.subscription_data.trial_period_days = trialDays;
      }
      // If no trial days specified, don't set trial_period_days to ensure no trial is applied

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(
        `Created enhanced Stripe checkout session ${session.id} for organization ${organizationId} with trial: ${trialDays || 0} days`,
      );
      return session;
    } catch (error) {
      this.logger.error(
        `Failed to create enhanced Stripe checkout session for organization ${createEnhancedCheckoutSessionDto.organizationId}:`,
        error,
      );
      throw new BadRequestException(
        "Failed to create enhanced checkout session",
      );
    }
  }

  /**
   * Get existing Stripe product configuration
   */
  private async getProductConfig(
    planKey: string,
  ): Promise<PaymentProductConfig> {
    // Check cache first
    if (this.productConfigCache[planKey]) {
      return this.productConfigCache[planKey];
    }

    // Parse plan key (e.g., "business_plan_monthly" -> "business" and "month")
    const parts = planKey.split("_");
    if (parts.length < 3) {
      throw new BadRequestException(
        `Invalid plan key format: ${planKey}. Expected format: {plan}_plan_{billingCycle}`,
      );
    }

    const planType = parts[0]; // personal, business, company
    const billingCycleKey = parts[2]; // monthly, yearly

    // Map billing cycle keys to Stripe interval names
    const billingCycleMap = {
      monthly: "month",
      yearly: "year",
    };
    const billingCycle = billingCycleMap[billingCycleKey] || billingCycleKey;

    if (
      !planType ||
      !billingCycle ||
      !this.productIds[planType as keyof typeof this.productIds]
    ) {
      throw new BadRequestException(
        `Invalid plan key: ${planKey}. Plan type: ${planType}, Billing cycle: ${billingCycle}`,
      );
    }

    const productId = this.productIds[planType as keyof typeof this.productIds];

    try {
      // Fetch product and prices from Stripe
      const product = await this.stripe.products.retrieve(productId);
      const prices = await this.stripe.prices.list({
        product: productId,
        active: true,
        expand: ["data.product"],
      });

      // Find the price for the specified billing cycle
      const price = prices.data.find((p) => {
        if (p.type === "recurring" && p.recurring) {
          const interval = p.recurring.interval;
          return interval === billingCycle;
        }
        return false;
      });

      if (!price || price.type !== "recurring" || !price.recurring) {
        throw new BadRequestException(
          `No ${billingCycle} price found for product ${productId}`,
        );
      }

      // Create configuration
      const config: PaymentProductConfig = {
        planName: product.name,
        productId: product.id,
        priceId: price.id,
        pricePerSeat: (price.unit_amount || 0) / 100, // Convert from cents
        billingCycle: price.recurring.interval as BillingCycle,
        description:
          product.description || `${product.name} - ${billingCycle} billing`,
      };

      // Log product details to help debug trial/balance issues
      this.logger.log(
        `Product ${product.id} details: name=${product.name}, description=${product.description}, metadata=${JSON.stringify(product.metadata)}`,
      );
      this.logger.log(
        `Price ${price.id} details: unit_amount=${price.unit_amount}, recurring=${JSON.stringify(price.recurring)}, metadata=${JSON.stringify(price.metadata)}`,
      );

      // Cache the configuration
      this.productConfigCache[planKey] = config;

      this.logger.log(
        `Fetched product configuration for ${planKey}: ${product.name} at $${config.pricePerSeat}/seat/${billingCycle}`,
      );

      return config;
    } catch (error) {
      this.logger.error(
        `Failed to fetch product configuration for ${planKey}:`,
        error,
      );
      throw new BadRequestException(
        `Failed to fetch product configuration for ${planKey}`,
      );
    }
  }

  /**
   * Initialize product configurations (optional - can be called on startup)
   */
  async initializeProductConfigs(): Promise<void> {
    const planKeys = [
      "personal_plan_monthly",
      "personal_plan_yearly",
      "business_plan_monthly",
      "business_plan_yearly",
      "company_plan_monthly",
      "company_plan_yearly",
    ];

    for (const planKey of planKeys) {
      try {
        await this.getProductConfig(planKey);
      } catch (error) {
        this.logger.warn(`Failed to initialize ${planKey}:`, error);
      }
    }
  }

  /**
   * Create a free trial checkout session with automatic billing after trial
   */
  async createFreeTrialCheckoutSession(
    organizationId: string,
    customerEmail: string,
    customerName: string,
    seatsCount: number = 5,
  ): Promise<Stripe.Checkout.Session> {
    try {
      // Standardized trial settings
      const TRIAL_DAYS = 30; // 30-day free trial
      const PLAN_KEY = "business_plan_monthly"; // Use existing Business Plan monthly

      // Get existing product configuration
      const productConfig = await this.getProductConfig(PLAN_KEY);

      // Verify organization exists
      const organization =
        await this.organizationsService.findOne(organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization ${organizationId} not found`);
      }

      // Use provided email or fallback to organization owner's email
      const email = customerEmail || organization.owner?.email;
      if (!email) {
        throw new BadRequestException(
          "No customer email provided and organization owner email is missing.",
        );
      }

      // Create or get customer by email
      let customer = await this.getCustomerByEmail(email);
      if (!customer) {
        customer = await this.createCustomer(
          organizationId,
          email,
          customerName,
        );
      }

      // Create checkout session with trial using existing product/price
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: productConfig.priceId,
            quantity: seatsCount,
          },
        ],
        mode: "subscription",
        success_url: "https://your-app.com/dashboard",
        cancel_url: "https://your-app.com/pricing",
        client_reference_id: organizationId,
        metadata: {
          organization_id: organizationId,
          plan_name: productConfig.planName,
          plan_id: PLAN_KEY,
          price_per_seat: productConfig.pricePerSeat.toString(),
          billing_cycle: productConfig.billingCycle,
          seats_count: seatsCount.toString(),
          trial_days: TRIAL_DAYS.toString(),
          is_free_trial: "true",
        },
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: {
            organization_id: organizationId,
            plan_name: productConfig.planName,
            plan_id: PLAN_KEY,
            price_per_seat: productConfig.pricePerSeat.toString(),
            billing_cycle: productConfig.billingCycle,
            seats_count: seatsCount.toString(),
            is_free_trial: "true",
          },
        },
      });

      this.logger.log(
        `Created free trial Stripe checkout session ${session.id} for organization ${organizationId} with ${TRIAL_DAYS} days trial using existing product ${productConfig.productId}`,
      );
      return session;
    } catch (error) {
      this.logger.error(
        `Failed to create free trial Stripe checkout session for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException(
        "Failed to create free trial checkout session",
      );
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      const webhookSecret = this.configService.get<string>(
        "STRIPE_WEBHOOK_SECRET",
      );

      if (!webhookSecret) {
        this.logger.error(
          "STRIPE_WEBHOOK_SECRET environment variable is not set",
        );
        throw new Error("STRIPE_WEBHOOK_SECRET is required");
      }

      this.logger.log(
        `Attempting webhook signature verification with body length: ${rawBody.length}, signature length: ${signature.length}`,
      );

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      this.logger.log(
        `Webhook signature verified successfully for event type: ${event.type}`,
      );
      return event;
    } catch (error) {
      this.logger.error("Webhook signature verification failed:", {
        error: error.message,
        bodyLength: rawBody?.length,
        signatureLength: signature?.length,
        hasWebhookSecret: !!this.configService.get<string>(
          "STRIPE_WEBHOOK_SECRET",
        ),
        webhookSecretLength: this.configService.get<string>(
          "STRIPE_WEBHOOK_SECRET",
        )?.length,
      });

      if (error.message.includes("No signatures found")) {
        throw new BadRequestException(
          "Webhook signature verification failed: No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe?",
        );
      } else if (error.message.includes("Invalid signature")) {
        throw new BadRequestException(
          "Webhook signature verification failed: Invalid signature",
        );
      } else {
        throw new BadRequestException(
          `Webhook signature verification failed: ${error.message}`,
        );
      }
    }
  }

  /**
   * Get webhook secret for debugging purposes
   */
  getWebhookSecret(): string | undefined {
    return this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId =
            session.client_reference_id || session.metadata?.organization_id;

          if (orgId && session.subscription) {
            // Fetch the subscription from Stripe
            const stripeSub = await this.stripe.subscriptions.retrieve(
              session.subscription as string,
            );
            const subData = stripeSub as StripeSubscriptionWithDates;

            // Extract metadata from session
            const planName = session.metadata?.plan_name || "Unknown Plan";
            const planId =
              session.metadata?.plan_id || session.metadata?.plan_name;
            const seatsCount = parseInt(session.metadata?.seats_count || "1");

            // Create new immutable subscription record for checkout completion
            await this.immutableSubscriptionService.createSubscriptionRecord(
              {
                organization_id: orgId,
                stripe_subscription_id: stripeSub.id,
                status: stripeSub.status as SubscriptionStatus,
                stripe_plan_id: planId,
                stripe_product_id: stripeSub.items.data[0]?.price
                  .product as string,
                seats_count: seatsCount,
                // Restored Stripe fields
                stripe_customer_id: stripeSub.customer as string,
                stripe_price_id: stripeSub.items.data[0]?.price.id,
                stripe_latest_invoice_id: stripeSub.latest_invoice as string,
                stripe_default_payment_method_id:
                  stripeSub.default_payment_method as string,
                collection_method: stripeSub.collection_method,
                pause_collection:
                  stripeSub.pause_collection?.behavior === "keep_as_draft",
                livemode: stripeSub.livemode,
                stripe_metadata: stripeSub.metadata,
              },
              "Subscription created via Stripe checkout",
              {
                webhook_event: "checkout.session.completed",
                stripe_subscription_id: stripeSub.id,
                plan_name: planName,
                seats_count: seatsCount,
              },
            );

            this.logger.log(
              `Processed checkout.session.completed for organization ${orgId} with plan ${planName} and ${seatsCount} seats`,
            );
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;

          // Enhanced logging for deleted subscriptions
          if (event.type === "customer.subscription.deleted") {
            this.logger.log(
              `Processing deleted subscription ${sub.id}:`,
              "PaymentService",
              {
                subscriptionId: sub.id,
                customerId: sub.customer,
                metadata: sub.metadata,
                hasLatestInvoice: !!sub.latest_invoice,
                status: sub.status,
              },
            );
          }

          // Try to get orgId from multiple sources
          let orgId: string | undefined;

          // 1. Check subscription metadata directly
          orgId = sub.metadata?.organization_id;
          if (orgId) {
            this.logger.log(
              `Found orgId from subscription metadata: ${orgId}`,
              "PaymentService",
            );
          }

          // 2. If not found, try to find from checkout session
          if (
            !orgId &&
            sub.latest_invoice &&
            typeof sub.latest_invoice === "string"
          ) {
            try {
              const invoice = await this.stripe.invoices.retrieve(
                sub.latest_invoice,
              );
              const invoiceData = invoice as StripeInvoiceWithPaymentIntent;
              if (
                invoiceData.subscription &&
                invoiceData.subscription === sub.id &&
                invoiceData.charge
              ) {
                const charges = await this.stripe.charges.list({
                  payment_intent: invoiceData.payment_intent,
                  limit: 1,
                });
                if (charges.data.length > 0) {
                  const charge = charges
                    .data[0] as StripeChargeWithPaymentIntent;
                  if (charge.invoice === invoice.id && charge.payment_intent) {
                    const sessions = await this.stripe.checkout.sessions.list({
                      payment_intent: charge.payment_intent as string,
                      limit: 1,
                    });
                    if (sessions.data.length > 0) {
                      orgId =
                        sessions.data[0].client_reference_id ||
                        sessions.data[0].metadata?.organization_id;
                    }
                  }
                }
              }
            } catch (error) {
              this.logger.warn(
                `Failed to extract orgId from invoice for subscription ${sub.id}:`,
                error,
              );
            }
          }

          // 3. If still not found, try customer sessions
          if (!orgId && sub.customer && typeof sub.customer === "string") {
            try {
              const sessions = await this.stripe.checkout.sessions.list({
                customer: sub.customer,
                limit: 10,
              });
              const session = sessions.data.find(
                (s) => s.subscription === sub.id,
              );
              if (session) {
                orgId =
                  session.client_reference_id ||
                  session.metadata?.organization_id;
              }
            } catch (error) {
              this.logger.warn(
                `Failed to extract orgId from customer sessions for subscription ${sub.id}:`,
                error,
              );
            }
          }

          // 4. If still not found, try customer metadata
          if (!orgId && sub.customer && typeof sub.customer === "string") {
            try {
              const customer = await this.stripe.customers.retrieve(
                sub.customer,
              );
              const customerData = customer as StripeCustomerWithMetadata;
              orgId = customerData.metadata?.organization_id;
            } catch (error) {
              this.logger.warn(
                `Failed to extract orgId from customer metadata for subscription ${sub.id}:`,
                error,
              );
            }
          }

          // 5. Last resort: Look up subscription ID in our database
          if (!orgId) {
            try {
              const existingSubscription = await this.orgSubRepo.findOne({
                where: { stripe_subscription_id: sub.id },
                select: ["organization_id"],
              });

              if (existingSubscription) {
                orgId = existingSubscription.organization_id;
                this.logger.log(
                  `Found organization ID ${orgId} for deleted subscription ${sub.id} from database lookup`,
                );
              }
            } catch (error) {
              this.logger.warn(
                `Failed to lookup subscription ${sub.id} in database:`,
                error,
              );
            }
          }

          if (orgId) {
            this.logger.log(
              `Processing subscription ${sub.id} for organization ${orgId}`,
            );
            const subData = sub as StripeSubscriptionWithDates;

            // Extract metadata from subscription
            const planName = sub.metadata?.plan_name || "Unknown Plan";
            const planId = sub.metadata?.plan_id || sub.metadata?.plan_name;
            const seatsCount = parseInt(sub.metadata?.seats_count || "1");

            // Handle subscription deletion differently
            if (event.type === "customer.subscription.deleted") {
              // Extract cancellation feedback from Stripe metadata
              const cancellationReason =
                sub.metadata?.cancellation_reason || "No reason provided";
              const cancellationFeedback =
                sub.metadata?.cancellation_feedback || null;
              const cancellationComment =
                sub.metadata?.cancellation_comment || null;
              const cancellationDetails = {
                webhook_event: "customer.subscription.deleted",
                stripe_subscription_id: sub.id,
                cancellation_reason: cancellationReason,
                cancellation_feedback: cancellationFeedback,
                stripe_cancellation_reason:
                  sub.metadata?.stripe_cancellation_reason || null,
                stripe_cancellation_feedback:
                  sub.metadata?.stripe_cancellation_feedback || null,
                // Include any other cancellation-related metadata
                ...Object.fromEntries(
                  Object.entries(sub.metadata || {}).filter(
                    ([key]) =>
                      key.startsWith("cancellation_") ||
                      key.startsWith("unsubscribe_"),
                  ),
                ),
              };

              // When subscription is deleted, create new immutable record with CANCELLED status
              await this.immutableSubscriptionService.createSubscriptionRecord(
                {
                  organization_id: orgId,
                  stripe_subscription_id: null, // Clear since subscription no longer exists
                  status: SubscriptionStatus.CANCELLED,
                  stripe_plan_id: null,
                  stripe_product_id: null,
                  seats_count: 1, // Reset to minimum
                  // Clear Stripe fields since subscription no longer exists
                  stripe_customer_id: null,
                  stripe_price_id: null,
                  stripe_latest_invoice_id: null,
                  stripe_default_payment_method_id: null,
                  collection_method: null,
                  pause_collection: false,
                  livemode: false,
                  stripe_metadata: null,
                  // Enhanced cancellation tracking
                  cancellation_reason: cancellationReason,
                  stripe_cancellation_reason:
                    sub.metadata?.stripe_cancellation_reason || null,
                  stripe_cancellation_feedback: cancellationFeedback,
                  stripe_cancellation_comment: cancellationComment || null,
                },
                "Subscription cancelled via Stripe webhook",
                cancellationDetails,
              );

              this.logger.log(
                `Subscription ${sub.id} deleted for organization ${orgId} - new immutable record created with CANCELLED status`,
              );
            } else {
              // Normal subscription update - map Stripe status to our enum
              let mappedStatus: SubscriptionStatus;
              switch (sub.status) {
                case "active":
                  mappedStatus = SubscriptionStatus.ACTIVE;
                  break;
                case "canceled":
                  mappedStatus = SubscriptionStatus.CANCELLED;
                  break;
                case "past_due":
                  mappedStatus = SubscriptionStatus.PAST_DUE;
                  break;
                case "trialing":
                  mappedStatus = SubscriptionStatus.TRIALING;
                  break;
                case "incomplete":
                  mappedStatus = SubscriptionStatus.INCOMPLETE;
                  break;
                case "incomplete_expired":
                  mappedStatus = SubscriptionStatus.INCOMPLETE_EXPIRED;
                  break;
                case "unpaid":
                  mappedStatus = SubscriptionStatus.UNPAID;
                  break;
                case "paused":
                  mappedStatus = SubscriptionStatus.PAUSED;
                  break;
                default:
                  this.logger.warn(
                    `Unknown Stripe subscription status: ${sub.status}, defaulting to ACTIVE`,
                  );
                  mappedStatus = SubscriptionStatus.ACTIVE;
              }

              this.logger.log(
                `Mapping Stripe status '${sub.status}' to '${mappedStatus}' for subscription ${sub.id}`,
              );

              // Check if subscription is scheduled for cancellation
              const subData = sub as StripeSubscriptionWithDates;
              const isScheduledForCancellation =
                sub.cancel_at_period_end === true;
              const cancelAtPeriodEnd =
                isScheduledForCancellation && subData.current_period_end
                  ? subData.current_period_end
                  : null;

              // Extract cancellation details from Stripe webhook cancellation_details
              const cancellationDetails = sub.cancellation_details;
              const cancellationReason = cancellationDetails?.reason || null;
              const cancellationFeedback =
                cancellationDetails?.feedback || null;
              const cancellationComment = cancellationDetails?.comment || null;

              if (isScheduledForCancellation) {
                this.logger.log(
                  `🎯 CANCELLATION SCHEDULED: Subscription ${sub.id} will cancel at period end: ${cancelAtPeriodEnd ? new Date(cancelAtPeriodEnd * 1000).toISOString() : "unknown"}`,
                );

                // Log cancellation details if available
                if (
                  cancellationReason ||
                  cancellationFeedback ||
                  cancellationComment
                ) {
                  this.logger.log(
                    `📝 CANCELLATION DETAILS: Reason: ${cancellationReason || "None"}, Feedback: ${cancellationFeedback || "None"}, Comment: ${cancellationComment || "None"}`,
                  );
                }

                // Update status to SCHEDULED_FOR_CANCELLATION for immediate detection
                mappedStatus = SubscriptionStatus.SCHEDULED_FOR_CANCELLATION;
              }

              // Create new immutable subscription record instead of updating
              const subscriptionData = {
                organization_id: orgId,
                stripe_subscription_id: sub.id,
                status: mappedStatus,
                stripe_plan_id: planId,
                stripe_product_id: sub.items.data[0]?.price.product as string,
                seats_count: seatsCount,
                // Restored Stripe fields
                stripe_customer_id: sub.customer as string,
                stripe_price_id: sub.items.data[0]?.price.id,
                stripe_latest_invoice_id: sub.latest_invoice as string,
                stripe_default_payment_method_id:
                  sub.default_payment_method as string,
                collection_method: sub.collection_method,
                pause_collection:
                  sub.pause_collection?.behavior === "keep_as_draft",
                livemode: sub.livemode,
                // Enhanced lifecycle tracking
                is_scheduled_for_cancellation: isScheduledForCancellation,
                scheduled_cancellation_date: cancelAtPeriodEnd
                  ? new Date(cancelAtPeriodEnd * 1000)
                  : null,
                subscription_expiry_date: cancelAtPeriodEnd
                  ? new Date(cancelAtPeriodEnd * 1000)
                  : null,
                // Add billing period dates - these are in items.data[0]
                current_period_start: sub.items.data[0]?.current_period_start
                  ? new Date(sub.items.data[0].current_period_start * 1000)
                  : null,
                current_period_end: sub.items.data[0]?.current_period_end
                  ? new Date(sub.items.data[0].current_period_end * 1000)
                  : null,
                // Add actual cancellation date if subscription is cancelled
                canceled_at: sub.canceled_at
                  ? new Date(sub.canceled_at * 1000)
                  : null,
                // Enhanced cancellation tracking - now properly capturing from cancellation_details
                cancellation_reason: cancellationReason,
                stripe_cancellation_reason: cancellationReason,
                stripe_cancellation_feedback: cancellationFeedback,
                stripe_cancellation_comment: cancellationComment || null,

                stripe_metadata: {
                  ...sub.metadata,
                  cancel_at_period_end: isScheduledForCancellation,
                  cancel_at_period_end_date: cancelAtPeriodEnd
                    ? new Date(cancelAtPeriodEnd * 1000).toISOString()
                    : null,
                  // Include cancellation details in metadata for easy access
                  cancellation_reason: cancellationReason,
                  cancellation_feedback: cancellationFeedback,
                  cancellation_comment: cancellationComment,
                },
              };

              // Log the subscription data being processed for debugging
              this.logger.log(
                `🔄 Processing subscription change for ${sub.id}: status=${mappedStatus}, scheduled_for_cancellation=${isScheduledForCancellation}, cancel_date=${cancelAtPeriodEnd ? new Date(cancelAtPeriodEnd * 1000).toISOString() : "none"}`,
              );

              // Use immutable service to create new record
              await this.immutableSubscriptionService.createSubscriptionRecord(
                subscriptionData,
                isScheduledForCancellation
                  ? "Cancellation scheduled via Stripe webhook"
                  : "Subscription updated via Stripe webhook",
                {
                  webhook_event: "customer.subscription.updated",
                  stripe_subscription_id: sub.id,
                  is_scheduled_for_cancellation: isScheduledForCancellation,
                  cancel_at_period_end_date: cancelAtPeriodEnd
                    ? new Date(cancelAtPeriodEnd * 1000).toISOString()
                    : null,
                },
              );
            }

            this.logger.log(
              `Updated subscription for organization ${orgId} with plan ${planName} and ${seatsCount} seats`,
            );
          } else {
            this.logger.warn(
              `Could not extract organization ID for subscription ${sub.id}`,
            );
          }
          break;
        }
        case "customer.subscription.trial_will_end": {
          const sub = event.data.object as Stripe.Subscription;
          const orgId = sub.metadata?.organization_id;

          if (orgId) {
            this.logger.log(
              `Trial ending soon for organization ${orgId} subscription ${sub.id}`,
            );
            // You can add notification logic here
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const orgId = invoice.metadata?.organization_id;

          if (orgId) {
            this.logger.log(
              `Payment failed for organization ${orgId} invoice ${invoice.id}`,
            );
            // You can add notification logic here
          }
          break;
        }
        case "product.created":
        case "product.updated": {
          const product = event.data.object as Stripe.Product;
          await this.syncProductFromStripe(product);
          break;
        }
        case "price.created":
        case "price.updated": {
          const price = event.data.object as Stripe.Price;
          await this.syncPriceFromStripe(price);
          break;
        }
        case "billing_portal.session.created": {
          const session = event.data.object as Stripe.BillingPortal.Session;
          this.logger.log(
            `Billing portal session created for customer ${session.customer}`,
          );
          // This event is informational - no action needed
          break;
        }
        default:
          this.logger.log(
            `Unhandled event type: ${event.type}`,
            "PaymentService",
          );
      }
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve subscription ${subscriptionId}:`,
        error,
      );
      throw new NotFoundException("Subscription not found");
    }
  }

  /**
   * Get customer by email (more efficient than organization ID lookup)
   */
  async getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    try {
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      return customers.data[0] || null;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve customer for email ${email}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Create a customer for an organization if one doesn't exist
   */
  async createCustomerForOrganization(
    organizationId: string,
  ): Promise<Stripe.Customer | null> {
    try {
      // Get organization with owner information
      const organization = await this.organizationsRepo.findOne({
        where: { id: organizationId },
        relations: ["owner"],
        select: ["id", "name", "stripe_customer_id"],
      });

      if (!organization) {
        this.logger.warn(`Organization ${organizationId} not found`);
        return null;
      }

      if (organization.stripe_customer_id) {
        // Customer already exists, try to retrieve it
        try {
          const customer = await this.stripe.customers.retrieve(
            organization.stripe_customer_id,
          );
          if (customer && !customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          this.logger.warn(
            `Customer ${organization.stripe_customer_id} not found in Stripe, will create new one`,
          );
        }
      }

      // Get owner profile for customer details
      if (!organization.owner) {
        this.logger.warn(
          `Organization ${organizationId} has no owner information`,
        );
        return null;
      }

      const customerEmail = organization.owner.email;
      const customerName =
        organization.owner.first_name && organization.owner.last_name
          ? `${organization.owner.first_name} ${organization.owner.last_name}`
          : organization.owner.first_name ||
            organization.owner.last_name ||
            organization.owner.email ||
            "User";

      // Create new customer
      const customer = await this.createCustomer(
        organizationId,
        customerEmail,
        customerName,
      );

      // Update organization with customer ID
      organization.stripe_customer_id = customer.id;
      await this.organizationsRepo.save(organization);

      this.logger.log(
        `Created customer ${customer.id} for organization ${organizationId}`,
      );

      return customer;
    } catch (error) {
      this.logger.error(
        `Failed to create customer for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get customer ID from local database for an organization
   */
  async getCustomerIdFromDatabase(
    organizationId: string,
  ): Promise<string | null> {
    try {
      // First try to get the customer ID from the organization entity
      const organization = await this.organizationsRepo.findOne({
        where: { id: organizationId },
        select: ["id", "name", "stripe_customer_id"],
      });

      this.logger.log(
        `Organization ${organizationId} has stripe_customer_id: ${organization?.stripe_customer_id}`,
      );

      if (organization?.stripe_customer_id) {
        // Verify the customer exists in Stripe before returning
        try {
          const customer = await this.stripe.customers.retrieve(
            organization.stripe_customer_id,
          );
          if (customer && !customer.deleted) {
            this.logger.log(
              `Customer ${organization.stripe_customer_id} verified in Stripe for organization ${organizationId}`,
            );
            return organization.stripe_customer_id;
          } else {
            this.logger.warn(
              `Customer ${organization.stripe_customer_id} is deleted or invalid in Stripe for organization ${organizationId}`,
            );

            // Fallback: Create a new customer for the organization
            this.logger.log(
              `Creating new customer as fallback for organization ${organizationId}`,
            );

            try {
              const newCustomer =
                await this.createCustomerForOrganization(organizationId);
              if (newCustomer) {
                this.logger.log(
                  `Successfully created new customer ${newCustomer.id} for organization ${organizationId}`,
                );
                return newCustomer.id;
              }
            } catch (createError) {
              this.logger.error(
                `Failed to create fallback customer for organization ${organizationId}:`,
                createError,
              );
            }
          }
        } catch (stripeError) {
          this.logger.warn(
            `Customer ${organization.stripe_customer_id} not found in Stripe for organization ${organizationId}: ${stripeError}`,
          );

          // Fallback: Create a new customer for the organization
          this.logger.log(
            `Creating new customer as fallback for organization ${organizationId}`,
          );

          try {
            const newCustomer =
              await this.createCustomerForOrganization(organizationId);
            if (newCustomer) {
              this.logger.log(
                `Successfully created new customer ${newCustomer.id} for organization ${organizationId}`,
              );
              return newCustomer.id;
            }
          } catch (createError) {
            this.logger.error(
              `Failed to create fallback customer for organization ${organizationId}:`,
              createError,
            );
          }
        }
      }

      // Fallback: try to get customer ID from subscription table
      const subscription = await this.orgSubRepo.findOne({
        where: { organization_id: organizationId },
        select: ["stripe_customer_id"],
      });

      this.logger.log(
        `Subscription for organization ${organizationId} has stripe_customer_id: ${subscription?.stripe_customer_id}`,
      );

      if (subscription?.stripe_customer_id) {
        // Verify the customer exists in Stripe before using it
        try {
          const customer = await this.stripe.customers.retrieve(
            subscription.stripe_customer_id,
          );
          if (customer && !customer.deleted) {
            // Update the organization with the customer ID for future use
            await this.organizationsRepo.update(
              { id: organizationId },
              { stripe_customer_id: subscription.stripe_customer_id },
            );
            this.logger.log(
              `Updated organization ${organizationId} with verified customer ID ${subscription.stripe_customer_id}`,
            );
            return subscription.stripe_customer_id;
          } else {
            this.logger.error(
              `Customer ${subscription.stripe_customer_id} from subscription is deleted or invalid in Stripe`,
            );

            // Fallback: Create a new customer for the organization
            this.logger.log(
              `Creating new customer as fallback for organization ${organizationId}`,
            );

            try {
              const newCustomer =
                await this.createCustomerForOrganization(organizationId);
              if (newCustomer) {
                this.logger.log(
                  `Successfully created new customer ${newCustomer.id} for organization ${organizationId}`,
                );
                return newCustomer.id;
              }
            } catch (createError) {
              this.logger.error(
                `Failed to create fallback customer for organization ${organizationId}:`,
                createError,
              );
            }
          }
        } catch (stripeError) {
          this.logger.warn(
            `Customer ${subscription.stripe_customer_id} from subscription not found in Stripe: ${stripeError}`,
          );

          // Fallback: Create a new customer for the organization
          this.logger.log(
            `Creating new customer as fallback for organization ${organizationId}`,
          );

          try {
            const newCustomer =
              await this.createCustomerForOrganization(organizationId);
            if (newCustomer) {
              this.logger.log(
                `Successfully created new customer ${newCustomer.id} for organization ${organizationId}`,
              );
              return newCustomer.id;
            }
          } catch (createError) {
            this.logger.error(
              `Failed to create fallback customer for organization ${organizationId}:`,
              createError,
            );
          }
        }
      }

      this.logger.log(
        `No valid customer ID found for organization ${organizationId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve customer ID from database for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get customer by organization ID (deprecated - use getCustomerByEmail instead)
   * @deprecated Use getCustomerByEmail for better performance
   */
  async getCustomerByOrganizationId(
    organizationId: string,
    createIfNotExists = false,
  ): Promise<Stripe.Customer | null> {
    try {
      // First, try to find the customer ID from the organization entity
      const organization = await this.organizationsRepo.findOne({
        where: { id: organizationId },
        select: ["id", "name", "stripe_customer_id"],
      });
      if (organization?.stripe_customer_id) {
        try {
          const customer = await this.stripe.customers.retrieve(
            organization.stripe_customer_id,
          );
          if (customer && !customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (stripeError) {
          this.logger.warn(
            `Customer ${organization.stripe_customer_id} not found in Stripe for organization ${organizationId}`,
          );
        }
      }

      // Note: stripe_customer_id is now stored in organizations table, not organization_subscriptions

      // Fallback: search for customer by metadata (legacy approach)
      const customers = await this.stripe.customers.list({
        limit: 100, // Increased limit to search more customers
      });

      // Filter by metadata since Stripe API doesn't support metadata filtering in list
      const customer = customers.data.find(
        (c) => c.metadata?.organization_id === organizationId,
      );

      // If no customer found and createIfNotExists is true, try to create one
      if (!customer && createIfNotExists) {
        return await this.createCustomerForOrganization(organizationId);
      }

      return customer || null;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve customer for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get payment history for an organization
   */
  async getPaymentHistory(
    organizationId: string,
    limit = 10,
  ): Promise<Stripe.PaymentIntent[]> {
    try {
      // Get customer ID from local database
      const customerId = await this.getCustomerIdFromDatabase(organizationId);
      if (!customerId) {
        return [];
      }

      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });

      return paymentIntents.data;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve payment history for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to retrieve payment history");
    }
  }

  /**
   * Get invoices for an organization
   */
  async getInvoices(
    organizationId: string,
    limit = 10,
  ): Promise<Stripe.Invoice[]> {
    try {
      // Get customer ID from local database
      const customerId = await this.getCustomerIdFromDatabase(organizationId);
      if (!customerId) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ["data.subscription"],
      });

      return invoices.data;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve invoices for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to retrieve invoices");
    }
  }

  /**
   * Get detailed subscription information for an organization from local database
   */
  async getOrganizationSubscriptionDetails(
    organizationId: string,
  ): Promise<SubscriptionDetailsResponse> {
    try {
      // Get all subscriptions for the organization from local database
      const subscriptions = await this.orgSubRepo.find({
        where: { organization_id: organizationId },
        order: { created_at: "DESC" },
      });

      if (!subscriptions || subscriptions.length === 0) {
        return {
          hasSubscription: false,
          activeSubscription: null,
          message: "No subscription found for this organization.",
        };
      }

      // Get pricing plan details for each subscription
      const subscriptionsWithPricingPlans = await Promise.all(
        subscriptions.map(async (subscription) => {
          let pricingPlan = null;

          // Try to find the pricing plan based on stripe_product_id
          if (subscription.stripe_product_id) {
            pricingPlan = await this.pricingPlanRepo.findOne({
              where: { stripeProductId: subscription.stripe_product_id },
            });
          }

          // If we couldn't find by stripe_product_id, try to infer from plan_id
          if (!pricingPlan && subscription.stripe_plan_id) {
            const planId = subscription.stripe_plan_id.toLowerCase();
            let tier = null;

            if (planId.includes("personal")) {
              tier = PlanTier.PERSONAL;
            } else if (planId.includes("business")) {
              tier = PlanTier.BUSINESS;
            } else if (planId.includes("company")) {
              tier = PlanTier.COMPANY;
            } else if (planId.includes("custom")) {
              tier = PlanTier.CUSTOM;
            }

            if (tier) {
              pricingPlan = await this.pricingPlanRepo.findOne({
                where: { tier },
              });
            }
          }

          // Create pricing plan details object
          const pricingPlanDetails = pricingPlan
            ? {
                id: pricingPlan.id,
                tier: pricingPlan.tier,
                name: pricingPlan.name,
                description: pricingPlan.description,
                monthlyPrice: Number(pricingPlan.monthlyPrice),
                annualPrice: Number(pricingPlan.annualPrice),
                cta: pricingPlan.cta,
                seatLimit: pricingPlan.seatLimit,
                isPopular: pricingPlan.isPopular,
                isActive: pricingPlan.isActive,
                stripeProductId: pricingPlan.stripeProductId,
                stripeMonthlyPriceId: pricingPlan.stripeMonthlyPriceId,
                stripeAnnualPriceId: pricingPlan.stripeAnnualPriceId,
              }
            : null;

          // Add pricing plan details to subscription object
          return {
            ...subscription,
            pricingPlan: pricingPlanDetails,
          };
        }),
      );

      const activeSubscription = subscriptionsWithPricingPlans.find((sub) =>
        [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(
          sub.status,
        ),
      );

      return {
        hasSubscription: true,
        activeSubscription: activeSubscription || null,
        allSubscriptions: subscriptionsWithPricingPlans,
        subscriptionCount: subscriptionsWithPricingPlans.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription details for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to get subscription details");
    }
  }

  /**
   * Get subscription status for an organization
   */
  async getSubscriptionStatus(
    organizationId: string,
  ): Promise<SubscriptionStatusResponse> {
    try {
      const subscription = await this.orgSubRepo.findOne({
        where: { organization_id: organizationId },
        order: { created_at: "DESC" },
      });

      if (!subscription) {
        return {
          hasSubscription: false,
          status: null,
          isActive: false,
          isTrial: false,
        };
      }

      const isActive = subscription.status === SubscriptionStatus.ACTIVE;
      const isTrial = subscription.status === SubscriptionStatus.TRIALING;
      const isPastDue = subscription.status === SubscriptionStatus.PAST_DUE;

      // Get pricing plan details
      let pricingPlan = null;
      if (subscription.stripe_product_id) {
        pricingPlan = await this.pricingPlanRepo.findOne({
          where: { stripeProductId: subscription.stripe_product_id },
        });
      }

      // If we couldn't find by stripe_product_id, try to infer from plan_id
      if (!pricingPlan && subscription.stripe_plan_id) {
        const planId = subscription.stripe_plan_id.toLowerCase();
        let tier = null;

        if (planId.includes("personal")) {
          tier = PlanTier.PERSONAL;
        } else if (planId.includes("business")) {
          tier = PlanTier.BUSINESS;
        } else if (planId.includes("company")) {
          tier = PlanTier.COMPANY;
        } else if (planId.includes("custom")) {
          tier = PlanTier.CUSTOM;
        }

        if (tier) {
          pricingPlan = await this.pricingPlanRepo.findOne({
            where: { tier },
          });
        }
      }

      // Create pricing plan details object
      const pricingPlanDetails = pricingPlan
        ? {
            id: pricingPlan.id,
            tier: pricingPlan.tier,
            name: pricingPlan.name,
            description: pricingPlan.description,
            monthlyPrice: Number(pricingPlan.monthlyPrice),
            annualPrice: Number(pricingPlan.annualPrice),
            cta: pricingPlan.cta,
            seatLimit: pricingPlan.seatLimit,
            isPopular: pricingPlan.isPopular,
            isActive: pricingPlan.isActive,
            stripeProductId: pricingPlan.stripeProductId,
            stripeMonthlyPriceId: pricingPlan.stripeMonthlyPriceId,
            stripeAnnualPriceId: pricingPlan.stripeAnnualPriceId,
          }
        : null;

      return {
        hasSubscription: true,
        status: subscription.status,
        isActive,
        isTrial,
        isPastDue,
        seatsCount: subscription.seats_count,
        planId: subscription.stripe_plan_id,
        subscriptionId: subscription.stripe_subscription_id,
        pricingPlan: pricingPlanDetails,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription status for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException("Failed to get subscription status");
    }
  }

  /**
   * Check if organization has an active subscription
   */
  async hasActiveSubscription(organizationId: string): Promise<boolean> {
    try {
      const subscription = await this.orgSubRepo.findOne({
        where: { organization_id: organizationId },
        order: { created_at: "DESC" },
      });

      return (
        subscription !== null &&
        [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(
          subscription.status,
        )
      );
    } catch (error) {
      this.logger.error(
        `Failed to check active subscription for organization ${organizationId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create billing portal session for customer ${customerId}:`,
        error,
      );
      throw new BadRequestException("Failed to create billing portal session");
    }
  }

  /**
   * Get available plans from Stripe
   */
  async getAvailablePlans(): Promise<PaymentProductConfig[]> {
    try {
      const plans: PaymentProductConfig[] = [];

      for (const [planKey] of Object.entries(this.productIds)) {
        try {
          const config = await this.getProductConfig(planKey);
          plans.push(config);
        } catch (error) {
          this.logger.warn(`Failed to get config for plan ${planKey}:`, error);
        }
      }

      return plans;
    } catch (error) {
      this.logger.error("Failed to get available plans:", error);
      throw new BadRequestException("Failed to get available plans");
    }
  }

  /**
   * Sync pricing from Stripe webhook events
   */
  private async syncProductFromStripe(product: Stripe.Product): Promise<void> {
    try {
      // Check if this is one of our monitored products
      const relevantProductIds = [
        process.env.STRIPE_PERSONAL_PRODUCT_ID,
        process.env.STRIPE_BUSINESS_PRODUCT_ID,
        process.env.STRIPE_COMPANY_PRODUCT_ID,
      ];

      if (!relevantProductIds.includes(product.id)) {
        this.logger.log(
          `Skipping sync for non-monitored product: ${product.id}`,
        );
        return;
      }

      this.logger.log(
        `Syncing product from Stripe: ${product.id}`,
        "PaymentService",
      );

      // Determine which plan tier this product corresponds to
      let tier: PlanTier;
      if (product.id === process.env.STRIPE_PERSONAL_PRODUCT_ID) {
        tier = PlanTier.PERSONAL;
      } else if (product.id === process.env.STRIPE_BUSINESS_PRODUCT_ID) {
        tier = PlanTier.BUSINESS;
      } else if (product.id === process.env.STRIPE_COMPANY_PRODUCT_ID) {
        tier = PlanTier.COMPANY;
      } else {
        this.logger.warn(`Unknown product ID: ${product.id}`);
        return;
      }

      // Update the pricing plan in the database
      await this.pricingPlanRepo.update(
        { tier },
        {
          name: product.name || `Knowted ${tier} Plan`,
          description: product.description || `Knowted ${tier} Plan`,
          stripeProductId: product.id,
          updated_at: new Date(),
        },
      );

      this.logger.log(
        `Successfully synced product ${product.id} for tier ${tier}`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync product ${product.id}:`, error);
    }
  }

  /**
   * Sync price from Stripe webhook events
   */
  private async syncPriceFromStripe(price: Stripe.Price): Promise<void> {
    try {
      // Check if this price belongs to one of our monitored products
      const relevantProductIds = [
        process.env.STRIPE_PERSONAL_PRODUCT_ID,
        process.env.STRIPE_BUSINESS_PRODUCT_ID,
        process.env.STRIPE_COMPANY_PRODUCT_ID,
      ];

      if (!relevantProductIds.includes(price.product as string)) {
        this.logger.log(
          `Skipping sync for price of non-monitored product: ${price.product}`,
        );
        return;
      }

      this.logger.log(
        `Syncing price from Stripe: ${price.id}`,
        "PaymentService",
      );

      // Determine which plan tier this price corresponds to
      let tier: PlanTier;
      if (price.product === process.env.STRIPE_PERSONAL_PRODUCT_ID) {
        tier = PlanTier.PERSONAL;
      } else if (price.product === process.env.STRIPE_BUSINESS_PRODUCT_ID) {
        tier = PlanTier.BUSINESS;
      } else if (price.product === process.env.STRIPE_COMPANY_PRODUCT_ID) {
        tier = PlanTier.COMPANY;
      } else {
        this.logger.warn(`Unknown product ID for price: ${price.product}`);
        return;
      }

      // Calculate price per seat (convert from cents)
      const pricePerSeat = price.unit_amount ? price.unit_amount / 100 : 0;

      // Update the pricing plan based on billing cycle
      if (price.recurring?.interval === "month") {
        await this.pricingPlanRepo.update(
          { tier },
          {
            monthlyPrice: pricePerSeat,
            stripeMonthlyPriceId: price.id,
            updated_at: new Date(),
          },
        );
        this.logger.log(
          `Updated monthly price for tier ${tier}: $${pricePerSeat}`,
        );
      } else if (price.recurring?.interval === "year") {
        await this.pricingPlanRepo.update(
          { tier },
          {
            annualPrice: pricePerSeat,
            stripeAnnualPriceId: price.id,
            updated_at: new Date(),
          },
        );
        this.logger.log(
          `Updated annual price for tier ${tier}: $${pricePerSeat}`,
        );
      } else {
        this.logger.warn(
          `Unknown billing interval for price ${price.id}: ${price.recurring?.interval}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to sync price ${price.id}:`, error);
    }
  }

  /**
   * Get the current user's plan information by combining subscription data with pricing plan details
   */
  async getCurrentUserPlanInformation(
    organizationId: string,
  ): Promise<CurrentPlanDto> {
    try {
      // Get the current active subscription using the immutable subscription service
      const subscription =
        await this.immutableSubscriptionService.getCurrentSubscription(
          organizationId,
        );

      if (!subscription) {
        // Organization has no subscription - treat as free plan
        try {
          // Get usage information for free plan
          const usageData =
            await this.usageEventsService.getMonthlyMinutesUsage(
              organizationId,
            );

          return {
            hasSubscription: false,
            isActive: true, // Free plan is always active
            isTrial: false,
            isPastDue: false,
            planTier: "free" as PlanTier,
            planName: "Free",
            planDescription:
              "Perfect for getting started. No credit card required.",
            monthlyPrice: 0,
            annualPrice: 0,
            billingCycle: null,
            seatsCount: 1, // Free plan has 1 seat
            seatLimit: 1,
            planId: "free",
            subscriptionId: null,
            customerId: null,
            features: [],
            cancelAtPeriodEnd: false,
            cancelAt: null,
            message: "You are currently on the Free plan with 1 seat.",
            pricingPlan: null,
            // Usage information
            currentUsage: usageData.currentUsage,
            monthlyLimit: usageData.monthlyLimit,
            usagePercentage: usageData.usagePercentage,
            canInviteKnowted: usageData.canInviteKnowted,
            usageResetDate: usageData.resetDate,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to get usage data for free organization ${organizationId}:`,
            error,
          );
          // Fallback to basic free plan info without usage data
          return {
            hasSubscription: false,
            isActive: true,
            isTrial: false,
            isPastDue: false,
            planTier: "free" as PlanTier,
            planName: "Free",
            planDescription:
              "Perfect for getting started. No credit card required.",
            monthlyPrice: 0,
            annualPrice: 0,
            billingCycle: null,
            seatsCount: 1,
            seatLimit: 1,
            planId: "free",
            subscriptionId: null,
            customerId: null,
            features: [],
            cancelAtPeriodEnd: false,
            cancelAt: null,
            message: "You are currently on the Free plan with 1 seat.",
            pricingPlan: null,
            // Usage information (fallback values)
            currentUsage: 0,
            monthlyLimit: 500, // Default free plan limit
            usagePercentage: 0,
            canInviteKnowted: true,
            usageResetDate: new Date().toISOString(),
          };
        }
      }

      const isActive = subscription.status === SubscriptionStatus.ACTIVE;
      const isTrial = subscription.status === SubscriptionStatus.TRIALING;
      const isPastDue = subscription.status === SubscriptionStatus.PAST_DUE;

      // Determine plan tier from stripe_plan_id or plan metadata
      let planTier: PlanTier | null = null;
      let planName: string | null = null;
      let planDescription: string | null = null;
      let monthlyPrice: number | null = null;
      let annualPrice: number | null = null;
      let seatLimit: number | null = null;
      let billingCycle: string | null = null;

      // Try to find the pricing plan based on stripe_product_id
      let pricingPlan = null;
      if (subscription.stripe_product_id) {
        pricingPlan = await this.pricingPlanRepo.findOne({
          where: { stripeProductId: subscription.stripe_product_id },
        });

        if (pricingPlan) {
          planTier = pricingPlan.tier;
          planName = pricingPlan.name;
          planDescription = pricingPlan.description;
          monthlyPrice = Number(pricingPlan.monthlyPrice);
          annualPrice = Number(pricingPlan.annualPrice);
          seatLimit = pricingPlan.seatLimit;

          // Determine billing cycle from stripe_plan_id (contains billing cycle info)
          if (subscription.stripe_plan_id) {
            const planId = subscription.stripe_plan_id.toLowerCase();
            if (planId.includes("monthly")) {
              billingCycle = "monthly";
            } else if (planId.includes("yearly") || planId.includes("annual")) {
              billingCycle = "annual";
            }
          }
        }
      }

      // If we couldn't determine from pricing plan, try to infer from plan_id
      if (!planTier && subscription.stripe_plan_id) {
        const planId = subscription.stripe_plan_id.toLowerCase();
        if (planId.includes("personal")) {
          planTier = PlanTier.PERSONAL;
          planName = "Personal Plan";
        } else if (planId.includes("business")) {
          planTier = PlanTier.BUSINESS;
          planName = "Business Plan";
        } else if (planId.includes("company")) {
          planTier = PlanTier.COMPANY;
          planName = "Company Plan";
        } else if (planId.includes("custom")) {
          planTier = PlanTier.CUSTOM;
          planName = "Custom Plan";
        }

        if (planId.includes("monthly")) {
          billingCycle = "monthly";
        } else if (planId.includes("yearly") || planId.includes("annual")) {
          billingCycle = "annual";
        }
      }

      // Get plan features if we have a plan tier
      let features: CurrentPlanFeatureDto[] = [];
      if (planTier && !pricingPlan) {
        // If we don't have the pricing plan yet, get it by tier
        pricingPlan = await this.pricingPlanRepo.findOne({
          where: { tier: planTier },
        });
      }

      if (pricingPlan) {
        // Features are now hardcoded in frontend, so we return empty array
        features = [];
      }

      // Generate a helpful message
      let message: string | null = null;
      if (isTrial) {
        message = `Your ${planName || "plan"} is in trial mode with ${subscription.seats_count} seats`;
      } else if (isActive) {
        message = `Your ${planName || "plan"} is active with ${subscription.seats_count} seats`;
      } else if (isPastDue) {
        message = `Your ${planName || "plan"} payment is past due`;
      } else {
        message = `Your ${planName || "plan"} status: ${subscription.status}`;
      }

      // Get usage information
      let currentUsage: number | null = null;
      let monthlyLimit: number | null = null;
      let usagePercentage: number | null = null;
      let canInviteKnowted: boolean | null = null;
      let usageResetDate: string | null = null;

      try {
        const usageData =
          await this.usageEventsService.getMonthlyMinutesUsage(organizationId);
        currentUsage = usageData.currentUsage;
        monthlyLimit = usageData.monthlyLimit;
        usagePercentage = usageData.usagePercentage;
        canInviteKnowted = usageData.canInviteKnowted;
        usageResetDate = usageData.resetDate;
      } catch (error) {
        this.logger.warn(
          `Failed to get usage data for organization ${organizationId}:`,
          error,
        );
        // Usage data is optional, so we don't fail the entire request
      }

      // Create pricing plan details object
      const pricingPlanDetails = pricingPlan
        ? {
            id: pricingPlan.id,
            tier: pricingPlan.tier,
            name: pricingPlan.name,
            description: pricingPlan.description,
            monthlyPrice: Number(pricingPlan.monthlyPrice),
            annualPrice: Number(pricingPlan.annualPrice),
            cta: pricingPlan.cta,
            seatLimit: pricingPlan.seatLimit,
            isPopular: pricingPlan.isPopular,
            isActive: pricingPlan.isActive,
            stripeProductId: pricingPlan.stripeProductId,
            stripeMonthlyPriceId: pricingPlan.stripeMonthlyPriceId,
            stripeAnnualPriceId: pricingPlan.stripeAnnualPriceId,
          }
        : null;

      return {
        hasSubscription: true,
        status: subscription.status,
        isActive,
        isTrial,
        isPastDue,
        planTier,
        planName,
        planDescription,
        monthlyPrice,
        annualPrice,
        billingCycle,
        seatsCount: subscription.seats_count,
        seatLimit,
        planId: subscription.stripe_plan_id,
        subscriptionId: subscription.stripe_subscription_id,
        customerId: null, // Removed from entity, fetch from organizations table if needed
        features,
        cancelAtPeriodEnd: false, // Removed from entity, fetch from Stripe if needed
        cancelAt: null, // Removed from entity, fetch from Stripe if needed
        canceledAt: subscription.canceled_at || null,
        message,
        pricingPlan: pricingPlanDetails,
        // Usage information
        currentUsage,
        monthlyLimit,
        usagePercentage,
        canInviteKnowted,
        usageResetDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get current user plan information for organization ${organizationId}:`,
        error,
      );
      throw new BadRequestException(
        "Failed to get current user plan information",
      );
    }
  }

  /**
   * Validate seat addition for an organization
   */
  async validateSeatAddition(
    organizationId: string,
    additionalSeats: number,
  ): Promise<SeatValidationResult> {
    return this.seatManagementService.validateSeatAddition(
      organizationId,
      additionalSeats,
    );
  }

  /**
   * Validate seat count for an organization
   */
  async validateSeatCount(
    organizationId: string,
    requestedSeats: number,
  ): Promise<SeatValidationResult> {
    return this.seatManagementService.validateSeatCount(
      organizationId,
      requestedSeats,
    );
  }

  /**
   * Check if organization needs to upgrade plan
   */
  async checkUpgradeNeeded(
    organizationId: string,
  ): Promise<SeatUpgradeRecommendation | null> {
    return this.seatManagementService.checkUpgradeNeeded(organizationId);
  }

  /**
   * Get current seat usage for an organization
   */
  async getCurrentSeatUsage(organizationId: string) {
    return this.seatManagementService.getCurrentSeatUsage(organizationId);
  }

  /**
   * Get seat limit for a specific plan tier
   */
  async getSeatLimitForPlan(planTier: PlanTier): Promise<number> {
    return this.seatManagementService.getSeatLimitForPlan(planTier);
  }

  /**
   * Get compatible plans for a given seat count
   */
  async getCompatiblePlans(seatCount: number) {
    return this.seatManagementService.getCompatiblePlans(seatCount);
  }

  /**
   * Initialize product configurations when the module starts
   */
  async onModuleInit() {
    try {
      this.logger.log("Initializing Stripe product configurations...");
      await this.initializeProductConfigs();
      this.logger.log("Stripe product configurations initialized successfully");
    } catch (error) {
      this.logger.error(
        "Failed to initialize Stripe product configurations:",
        error,
      );
    }
  }

  /**
   * Check if a subscription can be updated based on its status
   * We allow more statuses to be updated since we're creating immutable records
   */
  private canSubscriptionBeUpdated(status: string): boolean {
    // Allow updates for most statuses - we'll create new immutable records anyway
    // Even cancelled subscriptions can be "updated" by creating new ones
    const blockedStatuses = ["incomplete_expired"];
    return !blockedStatuses.includes(status);
  }

  /**
   * Get helpful suggestion for subscription update issues
   */
  private getSubscriptionUpdateSuggestion(status: string): string {
    switch (status) {
      case "incomplete_expired":
        return "This subscription has expired and cannot be modified. Please create a new subscription instead.";
      default:
        return "This subscription status does not allow modifications. Please contact support for assistance.";
    }
  }
}
