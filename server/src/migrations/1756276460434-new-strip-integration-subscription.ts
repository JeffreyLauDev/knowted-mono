import { MigrationInterface, QueryRunner } from "typeorm";

export class NewStripIntegrationSubscription1756276460434
  implements MigrationInterface
{
  name = "NewStripIntegrationSubscription1756276460434";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "current_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "trial_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "trial_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "stripe_checkout_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "days_until_due"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "billing_cycle_anchor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "cancel_at_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "cancel_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "ended_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "is_scheduled_for_cancellation" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "cancellation_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "stripe_cancellation_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "stripe_cancellation_feedback" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "stripe_cancellation_comment" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "is_current" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "previous_version_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "superseded_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "change_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "change_metadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."usage_events_event_type_enum" RENAME TO "usage_events_event_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_events_event_type_enum" AS ENUM('meeting_created', 'meeting_completed', 'report_generated', 'query_executed', 'storage_uploaded', 'ai_memory_accessed', 'ai_title_generated', 'seat_added', 'seat_removed', 'meeting_type_created', 'meeting_type_deleted', 'call_minutes_used', 'ai_memory_retention_accessed', 'monthly_minutes_reset')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ALTER COLUMN "event_type" TYPE "public"."usage_events_event_type_enum" USING "event_type"::"text"::"public"."usage_events_event_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."usage_events_event_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" DROP COLUMN "quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ADD "quantity" double precision NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."pricing_plans_tier_enum" RENAME TO "pricing_plans_tier_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pricing_plans_tier_enum" AS ENUM('free', 'personal', 'business', 'company', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_plans" ALTER COLUMN "tier" TYPE "public"."pricing_plans_tier_enum" USING "tier"::"text"::"public"."pricing_plans_tier_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."pricing_plans_tier_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."organization_subscriptions_status_enum" RENAME TO "organization_subscriptions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum" AS ENUM('active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'scheduled_for_cancellation', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."organization_subscriptions_status_enum" USING "status"::"text"::"public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" SET DEFAULT 'trialing'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum_old" AS ENUM('active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" TYPE "public"."organization_subscriptions_status_enum_old" USING "status"::"text"::"public"."organization_subscriptions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ALTER COLUMN "status" SET DEFAULT 'trialing'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."organization_subscriptions_status_enum_old" RENAME TO "organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pricing_plans_tier_enum_old" AS ENUM('personal', 'business', 'company', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_plans" ALTER COLUMN "tier" TYPE "public"."pricing_plans_tier_enum_old" USING "tier"::"text"::"public"."pricing_plans_tier_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."pricing_plans_tier_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."pricing_plans_tier_enum_old" RENAME TO "pricing_plans_tier_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" DROP COLUMN "quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ADD "quantity" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_events_event_type_enum_old" AS ENUM('meeting_created', 'meeting_completed', 'report_generated', 'query_executed', 'storage_uploaded', 'ai_memory_accessed', 'ai_title_generated', 'seat_added', 'seat_removed', 'meeting_type_created', 'meeting_type_deleted', 'call_minutes_used', 'ai_memory_retention_accessed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ALTER COLUMN "event_type" TYPE "public"."usage_events_event_type_enum_old" USING "event_type"::"text"::"public"."usage_events_event_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."usage_events_event_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."usage_events_event_type_enum_old" RENAME TO "usage_events_event_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "change_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "change_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "superseded_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "previous_version_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "is_current"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "stripe_cancellation_comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "stripe_cancellation_feedback"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "stripe_cancellation_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "cancellation_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP COLUMN "is_scheduled_for_cancellation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "ended_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "cancel_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "cancel_at_period_end" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "billing_cycle_anchor" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "days_until_due" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "stripe_checkout_session_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "trial_end" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "trial_start" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD "current_period_end" TIMESTAMP`,
    );
  }
}
