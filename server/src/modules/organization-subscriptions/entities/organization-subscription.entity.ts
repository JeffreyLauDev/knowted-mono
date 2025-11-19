import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Organizations } from "../../organizations/entities/organizations.entity";
import { ChangeMetadata, StripeMetadata } from "../types/subscription-metadata.types";

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  TRIALING = "trialing",
  INCOMPLETE = "incomplete",
  INCOMPLETE_EXPIRED = "incomplete_expired",
  UNPAID = "unpaid",
  PAUSED = "paused",
  SCHEDULED_FOR_CANCELLATION = "scheduled_for_cancellation",
  EXPIRED = "expired",
}

@Entity("organization_subscriptions")
export class OrganizationSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @Column({ type: "int", default: 1 })
  seats_count: number;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIALING,
  })
  status: SubscriptionStatus;

  // Legacy: Billing cycle start point (no longer used for usage calculations)
  // Usage now resets based on organization creation date for consistency
  @Column({ type: "timestamp", nullable: true })
  current_period_start: Date;

  // Essential: Stripe identifiers for sync
  @Column({ type: "varchar", nullable: true })
  stripe_subscription_id: string;

  @Column({ type: "varchar", nullable: true })
  stripe_product_id: string;

  @Column({ type: "varchar", nullable: true })
  stripe_plan_id: string;

  // Stripe Customer & Billing Info
  @Column({ type: "varchar", nullable: true })
  stripe_customer_id: string;

  @Column({ type: "varchar", nullable: true })
  stripe_price_id: string;

  @Column({ type: "varchar", nullable: true })
  stripe_latest_invoice_id: string;

  @Column({ type: "varchar", nullable: true })
  stripe_default_payment_method_id: string;

  // Billing Configuration
  @Column({ type: "varchar", nullable: true })
  collection_method: string;

  // Stripe State Flags
  @Column({ type: "boolean", default: false })
  pause_collection: boolean;

  @Column({ type: "boolean", default: false })
  livemode: boolean;

  @Column({ type: "jsonb", nullable: true })
  stripe_metadata: StripeMetadata;

  // Subscription Lifecycle Tracking
  @Column({ type: "boolean", default: false })
  is_scheduled_for_cancellation: boolean;

  @Column({ type: "timestamp", nullable: true })
  canceled_at: Date;

  // Business Analytics Fields (calculated from lifecycle events)
  @Column({ type: "varchar", nullable: true })
  cancellation_reason: string; // Keep this for quick access

  // Enhanced cancellation feedback from Stripe
  @Column({ type: "varchar", nullable: true })
  stripe_cancellation_reason: string; // Stripe's cancellation reason category

  @Column({ type: "text", nullable: true })
  stripe_cancellation_feedback: string; // Free-form feedback from customer

  @Column({ type: "varchar", nullable: true })
  stripe_cancellation_comment: string; // Stripe's cancellation comment

  // Audit trail
  @CreateDateColumn()
  created_at: Date;

  // Immutable system - no updates, only new records
  @Column({ type: "boolean", default: false })
  is_current: boolean; // Only one record per subscription can be current

  @Column({ type: "int", default: 1 })
  version: number; // Track record versions

  @Column({ type: "uuid", nullable: true })
  previous_version_id: string; // Link to previous version

  @Column({ type: "timestamp", nullable: true })
  superseded_at: Date; // When this record was replaced

  @Column({ type: "varchar", nullable: true })
  change_reason: string; // Why this record was created

  @Column({ type: "jsonb", nullable: true })
  change_metadata: ChangeMetadata; // Additional change context

  // Relations
  @ManyToOne(() => Organizations, (organization) => organization.id)
  @JoinColumn({ name: "organization_id" })
  organization: Organizations;
}
