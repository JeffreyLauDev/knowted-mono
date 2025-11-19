import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import Stripe from "stripe";

import { OrganizationMembershipGuard } from "../../common/guards/organization-membership.guard";
import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationsService } from "../organizations/organizations.service";
import { RequirePermission } from "../permissions/decorators/require-permission.decorator";
import { PermissionGuard } from "../permissions/guards/permission.guard";
import { PlanTier } from "../pricing/entities/pricing-plan.entity";
import { PricingService } from "../pricing/pricing.service";
import { ProfilesService } from "../profiles/profiles.service";

import {
  BillingPortalSessionResponseDto,
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
  CurrentPlanDto,
  CurrentPlanQueryDto,
  InvoiceResponseDto,
  PaymentHistoryResponseDto,
  SeatUsageDto,
  SeatValidationDto,
  SubscriptionDetailsResponseDto,
  SubscriptionStatusResponseDto,
  UpdateSubscriptionSeatsDto,
  UpgradeCheckDto,
} from "./dto";
import { PaymentService } from "./payment.service";

@ApiTags("Payment")
@ApiBearerAuth("access-token")
@Controller("api/v1/payment")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly profilesService: ProfilesService,
    private readonly organizationsService: OrganizationsService,
    private readonly pricingService: PricingService,
    private readonly logger: PinoLoggerService,
  ) {}

  @Post("create-free-trial-checkout-session")
  @RequirePermission("billing", "readWrite")
  @ApiOperation({
    summary:
      "Create a checkout session for free trial with automatic billing after trial",
    description:
      "Creates a free trial checkout session using the authenticated user's profile information. Seats are hardcoded to 1.",
  })
  @ApiResponse({
    status: 201,
    description: "Free trial checkout session created successfully",
    type: CreateCheckoutSessionDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - missing organization_id",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  async createFreeTrialCheckoutSession(
    @GetUser() user: { sub: string; email: string },
    @Query("organization_id") organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException("organization_id is required");
    }

    if (!user?.sub) {
      throw new BadRequestException(
        "User ID is required for payment operations.",
      );
    }

    // Get user profile to extract email and name
    const profile = await this.profilesService.getProfile(user.sub);
    // Use profile email and construct full name from first_name and last_name
    const customerEmail = profile.email;
    const customerName =
      profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name || profile.last_name || profile.email || "User";

    // Hardcode seats to 1
    const seatsCount = 1;
    const session = await this.paymentService.createFreeTrialCheckoutSession(
      organizationId,
      customerEmail,
      customerName,
      seatsCount,
    );

    return {
      sessionId: session.id,
      url: session.url,
      organizationId: organizationId,
      trialDays: 30,
    };
  }

  @Post("create-checkout-session")
  @UseGuards(JwtAuthGuard) // Only require JWT auth, not organization membership
  @ApiOperation({
    summary: "Create a checkout session for new subscription",
    description:
      "Creates a checkout session for a new subscription plan with specified seats and billing cycle.",
  })
  @ApiResponse({
    status: 201,
    description: "Checkout session created successfully",
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid parameters",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  async createCheckoutSession(
    @GetUser() user: { sub: string; email: string },
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ) {
    if (!user?.sub) {
      throw new BadRequestException(
        "User ID is required for payment operations.",
      );
    }

    // Get user profile to extract email and name
    const profile = await this.profilesService.getProfile(user.sub);
    const customerEmail = profile.email;
    const customerName =
      profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name || profile.last_name || profile.email || "User";

    // Use the organization ID from the request body
    const organizationId = createCheckoutSessionDto.organizationId;
    if (!organizationId) {
      throw new BadRequestException("Organization ID is required");
    }

    // Verify the user has access to this organization
    const userOrgs = await this.organizationsService.getUserOrganizations(
      user.sub,
    );
    const hasAccess = userOrgs.some((org) => org.id === organizationId);
    if (!hasAccess) {
      throw new BadRequestException(
        "User does not have access to this organization",
      );
    }

    // Get plan details from the pricing service based on plan tier
    const pricingPlan = await this.pricingService.getPlanByTier(
      createCheckoutSessionDto.planTier as any,
    );

    if (!pricingPlan) {
      throw new BadRequestException(
        `Plan tier '${createCheckoutSessionDto.planTier}' not found`,
      );
    }

    // Generate success and cancel URLs
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const successUrl = `${baseUrl}/organization/billing?success=true`;
    const cancelUrl = `${baseUrl}/organization/billing?canceled=true`;

    // Create checkout session using the existing Stripe product IDs
    const session =
      await this.paymentService.createCheckoutSessionWithExistingProduct(
        organizationId,
        `${createCheckoutSessionDto.planTier}_plan_${createCheckoutSessionDto.billingCycle === "year" ? "yearly" : "monthly"}`,
        createCheckoutSessionDto.seatsCount,
        successUrl,
        cancelUrl,
        undefined, // trialDays
        customerEmail,
      );

    return {
      sessionId: session.id,
      url: session.url,
      organizationId: organizationId,
      planName: pricingPlan.name,
      seatsCount: createCheckoutSessionDto.seatsCount,
      billingCycle: createCheckoutSessionDto.billingCycle,
    };
  }

  @Post("webhook")
  @ApiOperation({ summary: "Handle payment webhook events" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  async handleWebhook(@Body() event: Stripe.Event) {
    // Note: In production, you should verify the webhook signature
    // const stripeEvent = this.stripe.webhooks.constructEvent(
    //   rawBody,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );

    try {
      await this.paymentService.handleWebhook(event);
      return { received: true };
    } catch (error) {
      throw new BadRequestException("Webhook processing failed");
    }
  }

  @Post("subscription/:subscriptionId/cancel")
  @ApiOperation({ summary: "Cancel a subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription cancelled successfully",
  })
  async cancelSubscription(@Param("subscriptionId") subscriptionId: string) {
    try {
      const subscription =
        await this.paymentService.cancelSubscription(subscriptionId);

      this.logger.log(
        `Subscription ${subscriptionId} cancelled successfully`,
        "PaymentController",
      );

      return {
        id: subscription.id,
        status: subscription.status,
        cancelledAt: subscription.canceled_at,
        message: "Subscription cancelled successfully",
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}:`,
        error,
      );
      throw new BadRequestException("Failed to cancel subscription");
    }
  }

  @Post("subscription/:subscriptionId/update-seats")
  @ApiOperation({
    summary: "Update subscription seats count and plan tier",
    description:
      "Update both the number of seats and the plan tier for a subscription. All fields are required.",
  })
  @ApiBody({
    type: UpdateSubscriptionSeatsDto,
    description: "Subscription update parameters",
  })
  @ApiResponse({
    status: 200,
    description: "Subscription updated successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "sub_1234567890" },
        status: { type: "string", example: "active" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priceId: { type: "string", example: "price_business_monthly" },
              quantity: { type: "number", example: 3 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid parameters or validation failed",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - organization access denied",
  })
  async updateSubscriptionSeats(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: UpdateSubscriptionSeatsDto,
    @Query("organization_id") organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        "organization_id is required as a query parameter",
      );
    }

    const subscription = await this.paymentService.updateSubscriptionQuantity(
      subscriptionId,
      body.seatsCount,
      body.tier,
      body.billingCycle,
    );
    return {
      id: subscription.id,
      status: subscription.status,
      items: subscription.items.data.map((item) => ({
        priceId: item.price.id,
        quantity: item.quantity,
      })),
    };
  }

  @Get("seats/validate/:organizationId")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Validate seat addition for organization",
    description:
      "Check if adding additional seats would exceed the current plan's seat limit",
  })
  @ApiResponse({
    status: 200,
    description: "Seat validation result",
    type: SeatValidationDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid organization or seat count",
  })
  @ApiResponse({
    status: 404,
    description: "Organization not found",
  })
  async validateSeatAddition(
    @Param("organizationId") organizationId: string,
    @Query("additionalSeats") additionalSeats: number,
  ) {
    return this.paymentService.validateSeatAddition(
      organizationId,
      additionalSeats,
    );
  }

  @Get("seats/usage/:organizationId")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get current seat usage for organization",
    description:
      "Retrieve current seat usage statistics including usage percentage",
  })
  @ApiResponse({
    status: 200,
    description: "Current seat usage information",
    type: SeatUsageDto,
  })
  @ApiResponse({
    status: 404,
    description: "Organization not found",
  })
  async getCurrentSeatUsage(@Param("organizationId") organizationId: string) {
    return this.paymentService.getCurrentSeatUsage(organizationId);
  }

  @Get("seats/upgrade-check/:organizationId")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Check if organization needs to upgrade plan",
    description:
      "Analyze current seat usage and recommend plan upgrades if needed",
  })
  @ApiResponse({
    status: 200,
    description: "Upgrade recommendation if needed",
    type: UpgradeCheckDto,
  })
  @ApiResponse({
    status: 404,
    description: "Organization not found",
  })
  async checkUpgradeNeeded(@Param("organizationId") organizationId: string) {
    return this.paymentService.checkUpgradeNeeded(organizationId);
  }

  @Get("seats/limit/:planTier")
  @ApiOperation({
    summary: "Get seat limit for a plan tier",
    description:
      "Retrieve the maximum number of seats allowed for a specific plan tier",
  })
  @ApiResponse({
    status: 200,
    description: "Seat limit for the specified plan tier",
    schema: {
      type: "object",
      properties: {
        planTier: { type: "string", example: "business" },
        seatLimit: { type: "number", example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid plan tier",
  })
  async getSeatLimitForPlan(@Param("planTier") planTier: string) {
    return this.paymentService.getSeatLimitForPlan(planTier as PlanTier);
  }

  @Get("seats/compatible-plans")
  @ApiOperation({
    summary: "Get compatible plans for a seat count",
    description:
      "Find all plan tiers that can accommodate the specified number of seats",
  })
  @ApiResponse({
    status: 200,
    description: "List of compatible plans",
    schema: {
      type: "object",
      properties: {
        seatCount: { type: "number", example: 3 },
        compatiblePlans: {
          type: "array",
          items: {
            type: "object",
            properties: {
              planTier: { type: "string", example: "business" },
              seatLimit: { type: "number", example: 5 },
              pricePerSeat: { type: "number", example: 10 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid seat count",
  })
  async getCompatiblePlans(@Query("seatCount") seatCount: number) {
    return this.paymentService.getCompatiblePlans(seatCount);
  }

  @Get("organization/:organizationId/subscription-details")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({
    summary: "Get detailed subscription information for an organization",
  })
  @ApiResponse({
    status: 200,
    description: "Subscription details retrieved successfully",
    type: SubscriptionDetailsResponseDto,
  })
  async getOrganizationSubscriptionDetails(
    @Param("organizationId") organizationId: string,
  ) {
    const details =
      await this.paymentService.getOrganizationSubscriptionDetails(
        organizationId,
      );
    return details;
  }

  @Get("organization/:organizationId/subscription-status")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get subscription status for an organization" })
  @ApiResponse({
    status: 200,
    description: "Subscription status retrieved successfully",
    type: SubscriptionStatusResponseDto,
  })
  async getSubscriptionStatus(@Param("organizationId") organizationId: string) {
    const status =
      await this.paymentService.getSubscriptionStatus(organizationId);
    return status;
  }

  @Get("organization/:organizationId/has-active-subscription")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({ summary: "Check if organization has an active subscription" })
  @ApiResponse({
    status: 200,
    description: "Subscription status checked successfully",
  })
  async hasSubscription(@Param("organizationId") organizationId: string) {
    const hasActiveSubscription =
      await this.paymentService.hasActiveSubscription(organizationId);
    return { hasActiveSubscription };
  }

  @Get("organization/:organizationId/payment-history")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get payment history for an organization" })
  @ApiResponse({
    status: 200,
    description: "Payment history retrieved successfully",
    type: PaymentHistoryResponseDto,
  })
  async getPaymentHistory(
    @Param("organizationId") organizationId: string,
    @Query("limit") limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const payments = await this.paymentService.getPaymentHistory(
      organizationId,
      limitNumber,
    );
    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created: payment.created,
        paymentMethod: payment.payment_method,
      })),
      total: payments.length,
    };
  }

  @Get("organization/:organizationId/invoices")
  @UseGuards(OrganizationMembershipGuard)
  @ApiOperation({ summary: "Get invoices for an organization" })
  @ApiResponse({
    status: 200,
    description: "Invoices retrieved successfully",
    type: InvoiceResponseDto,
  })
  async getInvoices(
    @Param("organizationId") organizationId: string,
    @Query("limit") limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const invoices = await this.paymentService.getInvoices(
      organizationId,
      limitNumber,
    );
    return {
      invoices: invoices.map((invoice) => {
        return {
          id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status,
          created: invoice.created,
          dueDate: invoice.due_date,
          periodStart: invoice.period_start,
          periodEnd: invoice.period_end,
          subscriptionId: (
            invoice as Stripe.Invoice & { subscription?: { id: string } }
          ).subscription?.id,
        };
      }),
      total: invoices.length,
    };
  }

  @Get("current-plan")
  @ApiOperation({
    summary: "Get current plan information for an organization",
  })
  @ApiResponse({
    status: 200,
    description: "Current plan information retrieved successfully",
    type: CurrentPlanDto,
  })
  async getCurrentPlan(@Query() query: CurrentPlanQueryDto) {
    const plan = await this.paymentService.getCurrentUserPlanInformation(
      query.organization_id,
    );
    return plan;
  }

  @Post("organization/:organizationId/billing-portal-session")
  @ApiOperation({
    summary: "Create a billing portal session for an organization",
    description:
      "Creates a Stripe billing portal session that allows users to manage their subscription, update payment methods, and view billing history.",
  })
  @ApiResponse({
    status: 201,
    description: "Billing portal session created successfully",
    type: BillingPortalSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - organization not found or no customer associated",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 404,
    description: "Not found - Customer not found for organization",
  })
  async createBillingPortalSession(
    @Param("organizationId") organizationId: string,
    @Query("return_url") returnUrl: string,
  ) {
    if (!returnUrl) {
      throw new BadRequestException("return_url is required");
    }

    // Get the customer ID from local database
    const customerId =
      await this.paymentService.getCustomerIdFromDatabase(organizationId);

    if (!customerId) {
      throw new NotFoundException(
        `No customer found for organization ${organizationId}`,
      );
    }

    // Create the billing portal session
    const session = await this.paymentService.createBillingPortalSession(
      customerId,
      returnUrl,
    );

    return {
      id: session.id,
      url: session.url,
      customer: session.customer,
      return_url: session.return_url,
      created: session.created,
      livemode: session.livemode,
    };
  }
}

// Separate controller for webhooks without authentication
@ApiTags("Stripe Webhooks")
@Controller("api/v1/stripe")
export class StripeWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: PinoLoggerService,
  ) {}

  @Get("health")
  async healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      message: "Stripe webhook controller is running",
    };
  }

  @Get("test")
  async testWebhookConfig() {
    const webhookSecret = this.paymentService.getWebhookSecret();
    return {
      message: "Webhook configuration test",
      hasWebhookSecret: !!webhookSecret,
      webhookSecretLength: webhookSecret?.length || 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Post("webhook")
  async handleWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature: string,
  ) {
    try {
      // Log webhook request details for debugging
      this.logger.log("=== WEBHOOK REQUEST DEBUG ===");
      this.logger.log("Webhook received:", "PaymentController", {
        url: request.url,
        method: request.method,
        contentType: request.headers["content-type"],
        contentLength: request.headers["content-length"],
        hasRawBody: !!request.rawBody,
        rawBodyLength: request.rawBody?.length,
        hasSignature: !!signature,
        signatureLength: signature?.length,
        signatureHeader: request.headers["stripe-signature"],
        userAgent: request.headers["user-agent"],
        host: request.headers["host"],
      });

      let rawBody: Buffer;

      // Priority 1: Use the raw body if available (from bodyParser.raw middleware)
      if (request.rawBody) {
        rawBody = request.rawBody;
        this.logger.log(
          "✓ Using raw body from middleware, length:",
          "PaymentController",
          { length: rawBody.length },
        );
      } else if (Buffer.isBuffer(request.body)) {
        // Priority 2: Try to get raw body from request body
        rawBody = request.body;
        this.logger.log("✓ Using buffer body,  length:", "PaymentController", {
          length: rawBody.length,
        });
      } else if (typeof request.body === "string") {
        rawBody = Buffer.from(request.body, "utf8");
        this.logger.log(
          "✓ Using string body converted to buffer, length:",
          "PaymentController",
          { length: rawBody.length },
        );
      } else if (request.body && typeof request.body === "object") {
        // Last resort: stringify the body (this may cause signature verification to fail)
        rawBody = Buffer.from(JSON.stringify(request.body), "utf8");
        this.logger.log(
          "⚠ WARNING: Using stringified JSON body, signature verification may fail. Length:",
          "PaymentController",
          { length: rawBody.length },
        );
        this.logger.log("⚠ Body content preview:", "PaymentController", {
          preview: JSON.stringify(request.body).substring(0, 200),
        });
      } else {
        this.logger.log("✗ No request body available");
        throw new Error(
          "No request body available for webhook signature verification",
        );
      }

      if (!rawBody || rawBody.length === 0) {
        this.logger.log("✗ Raw body is empty or invalid");
        throw new Error("Raw body is not available or empty");
      }

      if (!signature) {
        this.logger.log("✗ Stripe signature header is missing");
        throw new Error("Stripe signature header is missing");
      }

      this.logger.log("=== ATTEMPTING SIGNATURE VERIFICATION ===");
      this.logger.log(
        "Attempting webhook signature verification with:",
        "PaymentController",
        {
          bodyLength: rawBody.length,
          signatureLength: signature.length,
          webhookSecret: this.paymentService.getWebhookSecret()
            ? "***SET***"
            : "***MISSING***",
          webhookSecretLength:
            this.paymentService.getWebhookSecret()?.length || 0,
          bodyPreview: rawBody.toString("utf8").substring(0, 200),
        },
      );

      const stripeEvent = this.paymentService.verifyWebhookSignature(
        rawBody,
        signature,
      );

      this.logger.log(
        "✓ Webhook signature verified successfully, event type:",
        stripeEvent.type,
      );
      this.logger.log("=== PROCESSING WEBHOOK EVENT ===");

      await this.paymentService.handleWebhook(stripeEvent);

      this.logger.log("✓ Webhook processed successfully");
      return { received: true };
    } catch (error) {
      this.logger.error("=== WEBHOOK PROCESSING ERROR ===");
      this.logger.error(
        "Webhook processing error:",
        undefined,
        "PaymentController",
        {
          error: error.message,
          stack: error.stack,
          requestUrl: request.url,
          hasRawBody: !!request.rawBody,
          rawBodyLength: request.rawBody?.length,
          hasSignature: !!signature,
          signatureLength: signature?.length,
          contentType: request.headers["content-type"],
          contentLength: request.headers["content-length"],
        },
      );

      // Return a more specific error message
      if (error.message.includes("signature")) {
        throw new BadRequestException("Invalid webhook signature");
      } else if (error.message.includes("body")) {
        throw new BadRequestException("Invalid webhook body");
      } else {
        throw new BadRequestException("Webhook processing failed");
      }
    }
  }
}
