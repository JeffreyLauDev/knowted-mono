import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableRls1751949776645 implements MigrationInterface {
  name = "EnableRls1751949776645";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS on all tables
    await queryRunner.query(`ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `ALTER TABLE "organization_invites" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_metrics" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_types" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `ALTER TABLE "pricing_plans" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_features" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "addon_bundles" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" ENABLE ROW LEVEL SECURITY`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Disable RLS on all tables
    await queryRunner.query(
      `ALTER TABLE "profiles" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `ALTER TABLE "organization_invites" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_metrics" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_types" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`ALTER TABLE "reports" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(
      `ALTER TABLE "pricing_plans" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_features" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "addon_bundles" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" DISABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "migrations" DISABLE ROW LEVEL SECURITY`,
    );
  }
}
