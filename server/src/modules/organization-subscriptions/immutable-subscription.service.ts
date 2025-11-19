import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { MoreThan, Repository } from "typeorm";

import { OrganizationSubscription } from "./entities/organization-subscription.entity";
import { ChangeMetadata, ChangeableFields, SubscriptionChanges } from "./types/subscription-metadata.types";

@Injectable()
export class ImmutableSubscriptionService {
  private readonly logger = new Logger(ImmutableSubscriptionService.name);

  constructor(
    @InjectRepository(OrganizationSubscription)
    private readonly subscriptionRepo: Repository<OrganizationSubscription>,
  ) {}

  /**
   * Create a new subscription record (never update existing)
   */
  async createSubscriptionRecord(
    subscriptionData: Partial<OrganizationSubscription>,
    changeReason: string,
    changeMetadata?: ChangeMetadata,
  ): Promise<OrganizationSubscription> {
    try {
      // Find the current active subscription for this organization
      const currentSubscription = await this.subscriptionRepo.findOne({
        where: {
          organization_id: subscriptionData.organization_id,
          stripe_subscription_id: subscriptionData.stripe_subscription_id,
          is_current: true,
        },
      });

      // Check if we already have a recent record with the same change reason and metadata
      // This prevents duplicate records from webhook events or race conditions
      const recentDuplicates = await this.subscriptionRepo.find({
        where: {
          organization_id: subscriptionData.organization_id,
          stripe_subscription_id: subscriptionData.stripe_subscription_id,
          created_at: MoreThan(new Date(Date.now() - 5 * 60 * 1000)), // Within last 5 minutes
        },
        order: { created_at: "DESC" },
      });

      // Additional check: look for concurrent requests (within 1 second) with same data
      const concurrentDuplicates = await this.subscriptionRepo.find({
        where: {
          organization_id: subscriptionData.organization_id,
          stripe_subscription_id: subscriptionData.stripe_subscription_id,
          created_at: MoreThan(new Date(Date.now() - 1000)), // Within last 1 second
        },
        order: { created_at: "DESC" },
      });

      if (concurrentDuplicates.length > 1) {
        this.logger.log(
          `🚨 Concurrent duplicate requests detected for subscription ${subscriptionData.stripe_subscription_id}, count: ${concurrentDuplicates.length}`,
        );
        // Return the most recent concurrent record to prevent duplicates
        return concurrentDuplicates[0];
      }

      // Just let everything through - no duplicate checking
      this.logger.log(
        `✅ Allowing record creation for subscription ${subscriptionData.stripe_subscription_id}`,
      );

      let newVersion = 1;
      let previousVersionId: string | null = null;

      if (currentSubscription) {
        // Mark current record as superseded
        await this.subscriptionRepo.update(
          { id: currentSubscription.id },
          {
            is_current: false,
            superseded_at: new Date(),
          },
        );

        newVersion = currentSubscription.version + 1;
        previousVersionId = currentSubscription.id;

        this.logger.log(
          `📝 Superseding subscription record ${currentSubscription.id} (v${currentSubscription.version}) with new record (v${newVersion})`,
        );
      }

      // Create new immutable record
      const newSubscription = this.subscriptionRepo.create({
        ...subscriptionData,
        is_current: true,
        version: newVersion,
        previous_version_id: previousVersionId,
        change_reason: changeReason,
        change_metadata: changeMetadata,
        created_at: new Date(),
      });

      const savedSubscription =
        await this.subscriptionRepo.save(newSubscription);

      // Log the change for debugging
      this.logger.log(
        `📝 Subscription record ${savedSubscription.id} (v${newVersion}) created for organization ${subscriptionData.organization_id}`,
      );

      this.logger.log(
        `✅ New subscription record created: ${savedSubscription.id} (v${newVersion}) for organization ${subscriptionData.organization_id}`,
      );

      return savedSubscription;
    } catch (error) {
      this.logger.error(
        `Failed to create subscription record for organization ${subscriptionData.organization_id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get current active subscription for an organization
   */
  async getCurrentSubscription(
    organizationId: string,
    stripeSubscriptionId?: string,
  ): Promise<OrganizationSubscription | null> {
    try {
      const whereClause: any = {
        organization_id: organizationId,
        is_current: true,
      };

      if (stripeSubscriptionId) {
        whereClause.stripe_subscription_id = stripeSubscriptionId;
      }

      return await this.subscriptionRepo.findOne({ where: whereClause });
    } catch (error) {
      this.logger.error(
        `Failed to get current subscription for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get complete subscription history for an organization
   */
  async getSubscriptionHistory(
    organizationId: string,
    stripeSubscriptionId?: string,
  ): Promise<OrganizationSubscription[]> {
    try {
      const whereClause: any = { organization_id: organizationId };

      if (stripeSubscriptionId) {
        whereClause.stripe_subscription_id = stripeSubscriptionId;
      }

      return await this.subscriptionRepo.find({
        where: whereClause,
        order: { version: "DESC" },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get subscription history for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get subscription analytics with versioning
   */
  async getSubscriptionAnalyticsWithVersioning(organizationId: string) {
    try {
      const allRecords = await this.getSubscriptionHistory(organizationId);
      const currentRecords = allRecords.filter((r) => r.is_current);

      // Calculate metrics from all records
      const totalRecords = allRecords.length;
      const totalSubscriptions = new Set(
        allRecords.map((r) => r.stripe_subscription_id),
      ).size;
      const activeSubscriptions = currentRecords.filter(
        (r) => r.status === "active",
      ).length;
      const cancelledSubscriptions = currentRecords.filter(
        (r) => r.status === "cancelled",
      ).length;
      const scheduledForCancellation = currentRecords.filter(
        (r) => r.is_scheduled_for_cancellation,
      ).length;

      // Calculate revenue from all versions (will be calculated from lifecycle events)
      const totalRevenue = 0; // TODO: Calculate from lifecycle events table

      // Calculate churn rate
      const churnRate =
        totalSubscriptions > 0
          ? (cancelledSubscriptions / totalSubscriptions) * 100
          : 0;
      const retentionRate = 100 - churnRate;

      // Get version history
      const versionHistory = allRecords.map((record) => ({
        id: record.id,
        version: record.version,
        status: record.status,
        created_at: record.created_at,
        superseded_at: record.superseded_at,
        change_reason: record.change_reason,
        is_current: record.is_current,
        seats_count: record.seats_count,
        stripe_subscription_id: record.stripe_subscription_id,
      }));

      return {
        summary: {
          totalRecords,
          totalSubscriptions,
          activeSubscriptions,
          cancelledSubscriptions,
          scheduledForCancellation,
          totalRevenue,
          churnRate: Math.round(churnRate * 100) / 100,
          retentionRate: Math.round(retentionRate * 100) / 100,
        },
        currentRecords,
        versionHistory,
        allRecords,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription analytics with versioning for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Extract fields that can change for comparison
   */
  protected extractChangeableFields(
    subscription: OrganizationSubscription,
  ): ChangeableFields {
    return {
      status: subscription.status,
      seats_count: subscription.seats_count,
      is_scheduled_for_cancellation: subscription.is_scheduled_for_cancellation,
      stripe_metadata: subscription.stripe_metadata,
    };
  }

  /**
   * Check if there are significant data changes that warrant a new record
   */
  protected hasSignificantDataChange(
    current: OrganizationSubscription,
    newData: Partial<OrganizationSubscription>,
  ): boolean {
    // Check if seats count changed
    if (
      newData.seats_count !== undefined &&
      newData.seats_count !== current.seats_count
    ) {
      return true;
    }

    // Check if plan changed
    if (
      newData.stripe_plan_id !== undefined &&
      newData.stripe_plan_id !== current.stripe_plan_id
    ) {
      return true;
    }

    // Check if status changed
    if (newData.status !== undefined && newData.status !== current.status) {
      return true;
    }

    // Check if cancellation status changed
    if (
      newData.is_scheduled_for_cancellation !== undefined &&
      newData.is_scheduled_for_cancellation !==
        current.is_scheduled_for_cancellation
    ) {
      return true;
    }

    // If no significant changes, return false
    return false;
  }

  /**
   * Check if two subscription records have exactly the same data
   */
  protected isExactDataDuplicate(
    existing: OrganizationSubscription,
    newData: Partial<OrganizationSubscription>,
  ): boolean {
    // Check core fields that should be identical for duplicates
    if (
      newData.seats_count !== undefined &&
      newData.seats_count !== existing.seats_count
    ) {
      return false;
    }

    if (
      newData.stripe_plan_id !== undefined &&
      newData.stripe_plan_id !== existing.stripe_plan_id
    ) {
      return false;
    }

    if (newData.status !== undefined && newData.status !== existing.status) {
      return false;
    }

    if (
      newData.is_scheduled_for_cancellation !== undefined &&
      newData.is_scheduled_for_cancellation !==
        existing.is_scheduled_for_cancellation
    ) {
      return false;
    }

    if (
      newData.stripe_price_id !== undefined &&
      newData.stripe_price_id !== existing.stripe_price_id
    ) {
      return false;
    }

    // If all core fields match, it's likely a duplicate
    return true;
  }

  /**
   * Get subscription timeline for business intelligence
   */
  async getSubscriptionTimeline(organizationId: string): Promise<{
    timeline: Array<{
      date: Date;
      event: string;
      record: OrganizationSubscription;
      changes?: SubscriptionChanges;
    }>;
    summary: {
      totalChanges: number;
      averageChangesPerMonth: number;
      mostFrequentChanges: string[];
    };
  }> {
    try {
      const history = await this.getSubscriptionHistory(organizationId);

      // Sort by creation date
      const sortedHistory = history.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const timeline = sortedHistory.map((record, index) => {
        const previousRecord = index > 0 ? sortedHistory[index - 1] : null;
        const changes = previousRecord
          ? this.calculateChanges(previousRecord, record)
          : undefined;

        return {
          date: record.created_at,
          event: record.change_reason || "Record created",
          record,
          changes,
        };
      });

      // Calculate summary statistics
      const totalChanges = timeline.length;
      const firstDate = timeline[0]?.date || new Date();
      const lastDate = timeline[timeline.length - 1]?.date || new Date();
      const monthsDiff =
        (lastDate.getTime() - firstDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30.44);
      const averageChangesPerMonth =
        monthsDiff > 0 ? totalChanges / monthsDiff : 0;

      // Most frequent change reasons
      const changeReasons = timeline.map((t) => t.event);
      const reasonCounts = changeReasons.reduce(
        (acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const mostFrequentChanges = Object.entries(reasonCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([reason]) => reason);

      return {
        timeline,
        summary: {
          totalChanges,
          averageChangesPerMonth:
            Math.round(averageChangesPerMonth * 100) / 100,
          mostFrequentChanges,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get subscription timeline for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate changes between two subscription records
   */
  protected calculateChanges(
    previous: OrganizationSubscription,
    current: OrganizationSubscription,
  ): SubscriptionChanges {
    const changes: SubscriptionChanges = {};

    // Compare key fields
    if (previous.status !== current.status) {
      changes.status = { from: previous.status, to: current.status };
    }

    if (previous.seats_count !== current.seats_count) {
      changes.seats_count = {
        from: previous.seats_count,
        to: current.seats_count,
      };
    }

    if (
      previous.is_scheduled_for_cancellation !==
      current.is_scheduled_for_cancellation
    ) {
      changes.is_scheduled_for_cancellation = {
        from: previous.is_scheduled_for_cancellation,
        to: current.is_scheduled_for_cancellation,
      };
    }

    return changes;
  }
}
