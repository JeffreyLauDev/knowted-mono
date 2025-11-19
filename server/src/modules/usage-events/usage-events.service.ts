import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { PinoLoggerService } from "../../common/logger/pino-logger.service";
import { OrganizationSubscription } from "../organization-subscriptions/entities/organization-subscription.entity";
import { ImmutableSubscriptionService } from "../organization-subscriptions/immutable-subscription.service";
import { Organizations } from "../organizations/entities/organizations.entity";

import { EventType, UsageEvent } from "./entities/usage-event.entity";

@Injectable()
export class UsageEventsService {
  constructor(
    @InjectRepository(UsageEvent)
    private readonly usageEventRepo: Repository<UsageEvent>,
    @InjectRepository(OrganizationSubscription)
    private readonly organizationSubscriptionsRepository: Repository<OrganizationSubscription>,
    @InjectRepository(Organizations)
    private readonly organizationsRepository: Repository<Organizations>,
    private readonly configService: ConfigService,
    private readonly immutableSubscriptionService: ImmutableSubscriptionService,
    private readonly logger: PinoLoggerService,
  ) {}

  async logEvent(
    orgId: string,
    eventType: EventType,
    userId?: string,
    metadata?: Record<string, unknown>,
    quantity = 1,
  ): Promise<UsageEvent> {
    const event = this.usageEventRepo.create({
      organization_id: orgId,
      user_id: userId,
      event_type: eventType,
      metadata,
      quantity,
    });
    return this.usageEventRepo.save(event);
  }

  async getEvents(orgId: string, eventType?: EventType): Promise<UsageEvent[]> {
    return this.usageEventRepo.find({
      where: {
        organization_id: orgId,
        ...(eventType ? { event_type: eventType } : {}),
      },
      order: { created_at: "DESC" },
    });
  }

  async getEventCount(
    orgId: string,
    eventType: EventType,
    since?: Date,
  ): Promise<number> {
    const query = this.usageEventRepo
      .createQueryBuilder("event")
      .where("event.organization_id = :orgId", { orgId })
      .andWhere("event.event_type = :eventType", { eventType });

    if (since) {
      query.andWhere("event.created_at >= :since", { since });
    }

    const result = await query.getCount();
    return result;
  }

  // Track seat usage (when users are added/removed from organization)
  async trackSeatAdded(
    orgId: string,
    userId: string,
    newSeatCount: number,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.SEAT_ADDED,
      userId,
      { newSeatCount },
      1,
    );
  }

  async trackSeatRemoved(
    orgId: string,
    userId: string,
    newSeatCount: number,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.SEAT_REMOVED,
      userId,
      { newSeatCount },
      1,
    );
  }

  // Track storage usage (when files are uploaded)
  async trackStorageUploaded(
    orgId: string,
    userId: string,
    fileSizeBytes: number,
  ): Promise<UsageEvent> {
    const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
    return this.logEvent(
      orgId,
      EventType.STORAGE_UPLOADED,
      userId,
      {
        fileSizeBytes,
        fileSizeGB: parseFloat(fileSizeGB.toFixed(4)),
      },
      fileSizeGB,
    );
  }

  // Track query usage (when database queries are executed)
  async trackQueryExecuted(
    orgId: string,
    userId: string,
    queryType: string,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.QUERY_EXECUTED,
      userId,
      { queryType },
      1,
    );
  }

  // Track call minutes (when meetings are completed)
  async trackCallMinutesUsed(
    orgId: string,
    userId: string,
    minutes: number,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.CALL_MINUTES_USED,
      userId,
      { meetingDurationMinutes: minutes },
      minutes,
    );
  }

  // Track meeting type creation/deletion
  async trackMeetingTypeCreated(
    orgId: string,
    userId: string,
    meetingTypeId: string,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.MEETING_TYPE_CREATED,
      userId,
      { meetingTypeId },
      1,
    );
  }

  async trackMeetingTypeDeleted(
    orgId: string,
    userId: string,
    meetingTypeId: string,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.MEETING_TYPE_DELETED,
      userId,
      { meetingTypeId },
      1,
    );
  }

  // Track AI memory retention access
  async trackAiMemoryRetentionAccessed(
    orgId: string,
    userId: string,
    memoryAgeDays: number,
  ): Promise<UsageEvent> {
    return this.logEvent(
      orgId,
      EventType.AI_MEMORY_RETENTION_ACCESSED,
      userId,
      { memoryAgeDays },
      1,
    );
  }

  // Get current usage for specific metrics
  async getCurrentUsage(
    orgId: string,
    metricType: string,
    since?: Date,
  ): Promise<number> {
    const eventTypeMap = {
      seats: [EventType.SEAT_ADDED, EventType.SEAT_REMOVED],
      storage: [EventType.STORAGE_UPLOADED],
      queries: [EventType.QUERY_EXECUTED],
      call_minutes: [EventType.CALL_MINUTES_USED],
      meeting_types: [
        EventType.MEETING_TYPE_CREATED,
        EventType.MEETING_TYPE_DELETED,
      ],
      monthly_reports: [EventType.REPORT_GENERATED],
      meetings: [EventType.MEETING_CREATED],
      ai_memory: [EventType.AI_MEMORY_RETENTION_ACCESSED],
    };

    const eventTypes = eventTypeMap[metricType];
    if (!eventTypes) {
      throw new Error(`Unknown metric type: ${metricType}`);
    }

    let totalUsage = 0;

    for (const eventType of eventTypes) {
      if (metricType === "seats") {
        // For seats, we need to calculate net seats (added - removed)
        const added = await this.getEventCount(
          orgId,
          EventType.SEAT_ADDED,
          since,
        );
        const removed = await this.getEventCount(
          orgId,
          EventType.SEAT_REMOVED,
          since,
        );
        totalUsage = added - removed;
        break; // Only process once for seats
      } else if (metricType === "meeting_types") {
        // For meeting types, we need to calculate net meeting types (created - deleted)
        const created = await this.getEventCount(
          orgId,
          EventType.MEETING_TYPE_CREATED,
          since,
        );
        const deleted = await this.getEventCount(
          orgId,
          EventType.MEETING_TYPE_DELETED,
          since,
        );
        totalUsage = created - deleted;
        break; // Only process once for meeting types
      } else {
        // For other metrics, sum the quantities with proper date filtering
        const query = this.usageEventRepo
          .createQueryBuilder("event")
          .select("SUM(event.quantity)", "total")
          .where("event.organization_id = :orgId", { orgId })
          .andWhere("event.event_type = :eventType", { eventType });

        if (since) {
          query.andWhere("event.created_at >= :since", { since });
        }

        const result = await query.getRawOne();
        const quantity = result?.total ? parseFloat(result.total) : 0;

        // Debug logging
        this.logger.log(`🔍 getCurrentUsage Debug:`, "UsageEventsService");
        this.logger.log(
          `  - Metric: ${metricType},  EventType: ${eventType}`,
          "UsageEventsService",
        );
        this.logger.log(
          `  - Since: ${since?.toISOString() || "none"}`,
          "UsageEventsService",
        );
        this.logger.log(`  - Query Result:`, result);
        this.logger.log(
          `  - Calculated Quantity: ${quantity}`,
          "UsageEventsService",
        );

        totalUsage += quantity;
      }
    }

    return totalUsage;
  }

  // Get usage summary for all metrics
  async getUsageSummary(
    orgId: string,
    since?: Date,
  ): Promise<Record<string, number>> {
    const metrics = [
      "seats",
      "storage",
      "queries",
      "call_minutes",
      "meeting_types",
      "monthly_reports",
      "meetings",
      "ai_memory",
    ];
    const summary: Record<string, number> = {};

    for (const metric of metrics) {
      summary[metric] = await this.getCurrentUsage(orgId, metric, since);
    }

    return summary;
  }

  // Get monthly minutes usage for freemium model
  async getMonthlyMinutesUsage(orgId: string): Promise<{
    currentUsage: number;
    monthlyLimit: number;
    usagePercentage: number;
    canInviteKnowted: boolean;
    resetDate: string;
    planTier?: string;
    seatCount?: number;
  }> {
    // Get organization subscription to determine billing cycle and plan
    // Use the immutable subscription service to get the current active subscription
    const subscription =
      await this.immutableSubscriptionService.getCurrentSubscription(orgId);

    if (!subscription) {
      // No subscription found, this is a free organization
      // Use organization creation date to calculate monthly cycles
      const organization = await this.organizationsRepository.findOne({
        where: { id: orgId },
        select: ["created_at"],
      });

      if (!organization) {
        throw new Error(`Organization ${orgId} not found`);
      }

      const now = new Date();
      const orgCreatedAt = new Date(organization.created_at);

      // Calculate the start of the current monthly cycle based on organization creation
      // If org was created on Jan 15th, then monthly cycles are: Jan 15, Feb 15, Mar 15, etc.
      const currentCycleStart = new Date(
        orgCreatedAt.getFullYear(),
        orgCreatedAt.getMonth(),
        orgCreatedAt.getDate(),
      );

      // Move to the current cycle
      while (currentCycleStart <= now) {
        currentCycleStart.setMonth(currentCycleStart.getMonth() + 1);
      }
      // Go back one month to get the current cycle start
      currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);

      // Get call minutes used since the start of the current monthly cycle
      const currentUsage = await this.getCurrentUsage(
        orgId,
        "call_minutes",
        currentCycleStart,
      );

      const monthlyLimit = this.configService.get(
        "usage.freeTrial.monthlyMinutes",
      );
      const seatCount = this.configService.get("usage.freeTrial.seatCount");

      // Debug logging
      this.logger.log(
        `🔍 Monthly Minutes Usage Debug (Free Org):`,
        "UsageEventsService",
      );
      this.logger.log(`  - Organization ID: ${orgId}`, "UsageEventsService");
      this.logger.log(`  - Plan Tier: Free Trial`, "UsageEventsService");
      this.logger.log(
        `  - Monthly Limit: ${monthlyLimit} minutes (total)`,
        "UsageEventsService",
      );
      this.logger.log(
        `  - Org Created At: ${organization.created_at.toISOString()}`,
        "UsageEventsService",
      );
      this.logger.log(
        `  - Cycle Start: ${currentCycleStart.toISOString()}`,
        "UsageEventsService",
      );
      this.logger.log(
        `  - Current Usage: ${currentUsage}`,
        "UsageEventsService",
      );

      const usagePercentage = Math.min(
        Math.round((currentUsage / monthlyLimit) * 100),
        100,
      );
      const canInviteKnowted = currentUsage < monthlyLimit;

      // Calculate reset date (start of next monthly cycle)
      const nextCycleStart = new Date(currentCycleStart);
      nextCycleStart.setMonth(nextCycleStart.getMonth() + 1);

      return {
        currentUsage,
        monthlyLimit,
        usagePercentage,
        canInviteKnowted,
        resetDate: nextCycleStart.toISOString(),
        planTier: "free",
        seatCount,
      };
    }

    const now = new Date();

    // Always use organization creation date for consistent monthly cycles
    // This ensures usage resets on the same day each month, regardless of subscription changes
    const organization = await this.organizationsRepository.findOne({
      where: { id: orgId },
      select: ["created_at"],
    });

    if (!organization) {
      throw new Error(`Organization ${orgId} not found`);
    }

    const orgCreatedAt = new Date(organization.created_at);

    // Calculate the start of the current monthly cycle based on organization creation
    // If org was created on Aug 15th, then monthly cycles are: Aug 15, Sep 15, Oct 15, etc.
    const currentCycleStart = new Date(
      orgCreatedAt.getFullYear(),
      orgCreatedAt.getMonth(),
      orgCreatedAt.getDate(),
    );

    // Move to the current cycle
    while (currentCycleStart <= now) {
      currentCycleStart.setMonth(currentCycleStart.getMonth() + 1);
    }
    // Go back one month to get the current cycle start
    currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);

    // Get call minutes used since the start of the current billing period
    const currentUsage = await this.getCurrentUsage(
      orgId,
      "call_minutes",
      currentCycleStart,
    );

    // Determine plan tier and calculate monthly limit based on subscription
    let planTier = "unknown";
    let monthlyLimit = this.configService.get("usage.defaults.monthlyMinutes");
    let seatCount = this.configService.get("usage.defaults.seatCount");

    // Check if this is a trial subscription - trials should be treated as free plans
    if (subscription.status === "trialing") {
      planTier = "trial";
      monthlyLimit = this.configService.get("usage.freeTrial.monthlyMinutes");
      seatCount = this.configService.get("usage.freeTrial.seatCount");
    } else if (subscription.stripe_product_id) {
      // Import the PricingPlan repository to get plan details
      const { PricingPlan } = await import(
        "../pricing/entities/pricing-plan.entity"
      );
      const pricingPlanRepo =
        this.usageEventRepo.manager.getRepository(PricingPlan);

      const pricingPlan = await pricingPlanRepo.findOne({
        where: { stripeProductId: subscription.stripe_product_id },
      });

      if (pricingPlan) {
        planTier = pricingPlan.tier;
        // Always use actual subscription seat count from organization_subscriptions table
        seatCount = subscription.seats_count;

        // Calculate monthly limit based on plan tier and actual seat count
        switch (pricingPlan.tier) {
          case "personal":
            monthlyLimit =
              this.configService.get(
                "usage.paidPlans.personal.minutesPerSeat",
              ) * seatCount;
            break;
          case "business":
            monthlyLimit =
              this.configService.get(
                "usage.paidPlans.business.minutesPerSeat",
              ) * seatCount;
            break;
          case "company":
            monthlyLimit =
              this.configService.get("usage.paidPlans.company.minutesPerSeat") *
              seatCount;
            break;
          case "custom":
            monthlyLimit =
              this.configService.get("usage.paidPlans.custom.minutesPerSeat") *
              seatCount;
            break;
          default:
            monthlyLimit =
              this.configService.get(
                "usage.paidPlans.business.minutesPerSeat",
              ) * seatCount; // Default to business tier
        }
      }
    }

    // Fallback: try to infer from plan_id if we couldn't determine from pricing plan
    // Only do this for non-trial subscriptions
    if (
      planTier === "unknown" &&
      subscription.stripe_plan_id &&
      subscription.status !== "trialing"
    ) {
      const planId = subscription.stripe_plan_id.toLowerCase();
      if (planId.includes("personal")) {
        planTier = "personal";
        monthlyLimit = this.configService.get(
          "usage.paidPlans.personal.minutesPerSeat",
        );
        seatCount = this.configService.get("usage.defaults.seatCount");
      } else if (planId.includes("business")) {
        planTier = "business";
        monthlyLimit = this.configService.get(
          "usage.paidPlans.business.minutesPerSeat",
        );
        seatCount = this.configService.get("usage.defaults.seatCount");
      } else if (planId.includes("company")) {
        planTier = "company";
        monthlyLimit = this.configService.get(
          "usage.paidPlans.company.minutesPerSeat",
        );
        seatCount = this.configService.get("usage.defaults.seatCount");
      } else if (planId.includes("custom")) {
        planTier = "custom";
        monthlyLimit = this.configService.get(
          "usage.paidPlans.custom.minutesPerSeat",
        );
        seatCount = this.configService.get("usage.defaults.seatCount");
      }
    }

    // Calculate usage percentage
    const usagePercentage = Math.min(
      Math.round((currentUsage / monthlyLimit) * 100),
      100,
    );

    // Check if organization can still invite Knowted (under the limit)
    const canInviteKnowted = currentUsage < monthlyLimit;

    // Calculate reset date based on organization creation date (next monthly cycle)
    const resetDate = new Date(currentCycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);

    // Debug logging
    this.logger.log(`🔍 Monthly Minutes Usage Debug:`, "UsageEventsService");
    this.logger.log(`  - Organization ID: ${orgId}`, "UsageEventsService");
    this.logger.log(
      `  - Subscription Status: ${subscription.status}`,
      "UsageEventsService",
    );
    this.logger.log(
      `  - Stripe Product ID: ${subscription.stripe_product_id || "null"}`,
      "UsageEventsService",
    );
    this.logger.log(
      `  - Stripe Plan ID: ${subscription.stripe_plan_id || "null"}`,
      "UsageEventsService",
    );
    this.logger.log(`  - Plan Tier: ${planTier}`, "UsageEventsService");
    this.logger.log(`  - Seat Count: ${seatCount}`, "UsageEventsService");
    this.logger.log(
      `  - Monthly Limit: ${monthlyLimit} minutes (${monthlyLimit / seatCount} per seat)`,
      "UsageEventsService",
    );
    this.logger.log(
      `  - Organization Created: ${organization.created_at.toISOString()}`,
      "UsageEventsService",
    );
    this.logger.log(
      `  - Cycle Start: ${currentCycleStart.toISOString()}`,
      "UsageEventsService",
    );
    this.logger.log(`  - Current Usage: ${currentUsage}`, "UsageEventsService");
    this.logger.log(
      `  - Next Reset: ${resetDate.toISOString()}`,
      "UsageEventsService",
    );
    this.logger.log(
      `  - Reset Date: ${resetDate.toISOString()}`,
      "UsageEventsService",
    );

    return {
      currentUsage,
      monthlyLimit,
      usagePercentage,
      canInviteKnowted,
      resetDate: resetDate.toISOString(),
      planTier,
      seatCount,
    };
  }

  // Reset monthly minutes usage for an organization
  async resetMonthlyMinutesUsage(
    orgId: string,
    reason: string = "admin_override",
  ): Promise<{
    success: boolean;
    message: string;
    organizationId: string;
    resetDate: string;
    reason: string;
  }> {
    try {
      // Log the reset event for audit purposes
      await this.logEvent(
        orgId,
        EventType.MONTHLY_MINUTES_RESET,
        "system", // System user
        {
          reason,
          resetDate: new Date().toISOString(),
          previousUsage: await this.getCurrentUsage(orgId, "call_minutes"),
        },
        1,
      );

      // Note: We don't actually delete usage events, we just track the reset
      // The getMonthlyMinutesUsage method will calculate from the reset date

      return {
        success: true,
        message: "Monthly minutes usage reset successfully",
        organizationId: orgId,
        resetDate: new Date().toISOString(),
        reason,
      };
    } catch (error) {
      throw new Error(
        `Failed to reset monthly minutes usage: ${error.message}`,
      );
    }
  }

  // Get monthly minutes reset history for an organization
  async getMonthlyMinutesResetHistory(orgId: string): Promise<{
    data: Array<{
      resetDate: string;
      reason: string;
      previousUsage: number;
      resetBy: string;
    }>;
  }> {
    try {
      const resetEvents = await this.getEvents(
        orgId,
        EventType.MONTHLY_MINUTES_RESET,
      );

      const historyItems = resetEvents.map((event) => ({
        resetDate: event.created_at.toISOString(),
        reason: event.metadata?.reason || "unknown",
        previousUsage: event.metadata?.previousUsage || 0,
        resetBy: event.user_id || "system",
      }));

      return {
        data: historyItems,
      };
    } catch (error) {
      throw new Error(`Failed to get reset history: ${error.message}`);
    }
  }
}
