import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1751949776644 implements MigrationInterface {
  name = "InitialMigration1751949776644";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" character varying NOT NULL, "first_name" character varying, "last_name" character varying, "avatar_url" character varying, "email" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "organization_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), "is_admin" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_org_admin" ON "teams" ("organization_id", "is_admin") WHERE is_admin = true`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "team_id" uuid NOT NULL, "email" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_accepted" boolean NOT NULL DEFAULT false, "accepted_by_user_id" uuid, CONSTRAINT "PK_e0799bee14bf23b82851d55fd05" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "name" text, "api_token" text, "website" text, "company_analysis" text, "company_type" text, "team_size" text, "business_description" text, "business_offering" text, "industry" text, "target_audience" text, "channels" text, "stripe_customer_id" character varying, "stripe_subscription_id" character varying, "owner_id" character varying NOT NULL, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_metrics_metric_type_enum" AS ENUM('meetings', 'reports', 'queries', 'call_minutes', 'storage_bytes', 'ai_memory_usage')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usage_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "metric_type" "public"."usage_metrics_metric_type_enum" NOT NULL, "current_usage" integer NOT NULL DEFAULT '0', "limit" integer NOT NULL DEFAULT '0', "period_start" date NOT NULL, "period_end" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_14c6ae2b6c1b7114c80fc3c1aec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "description" character varying, "analysis_metadata_structure" jsonb, "organization_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_572937435dcd02eee3c80126d31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "report_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "report_title" character varying(255) NOT NULL, "report_prompt" text NOT NULL, "report_schedule" jsonb NOT NULL DEFAULT '{"day":"1","time":"09:00","month":null,"frequency":"weekly"}', "organization_id" uuid NOT NULL, "user_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "active" boolean DEFAULT true, "generation_date" date, "run_at_utc" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_cf77ff01fa1da1f9978995e67c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_report_status_enum" AS ENUM('pending', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "report_title" text NOT NULL, "report_date" date NOT NULL, "report_detail" jsonb NOT NULL, "report_prompt" jsonb NOT NULL, "report_status" "public"."reports_report_status_enum" NOT NULL, "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "meeting_type_id" uuid, "report_type_id" uuid, "organization_id" uuid, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pricing_plans_tier_enum" AS ENUM('personal', 'business', 'company', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tier" "public"."pricing_plans_tier_enum" NOT NULL, "name" character varying NOT NULL, "description" text NOT NULL, "monthlyPrice" numeric(10,2) NOT NULL, "annualPrice" numeric(10,2) NOT NULL, "cta" character varying NOT NULL, "seatLimit" integer NOT NULL, "isPopular" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "inheritedFromPlanId" integer, "stripeProductId" character varying, "stripeMonthlyPriceId" character varying, "stripeAnnualPriceId" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_57aa9837d4777aafc70ba090fb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_events_event_type_enum" AS ENUM('meeting_created', 'meeting_completed', 'report_generated', 'query_executed', 'storage_uploaded', 'ai_memory_accessed', 'ai_title_generated', 'seat_added', 'seat_removed', 'meeting_type_created', 'meeting_type_deleted', 'call_minutes_used', 'ai_memory_retention_accessed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usage_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "user_id" uuid, "event_type" "public"."usage_events_event_type_enum" NOT NULL, "metadata" jsonb, "quantity" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9f17d50873fab2c46615f542bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pricing_features_feature_type_enum" AS ENUM('users_included', 'meeting_types', 'monthly_reports', 'monthly_queries', 'call_minutes', 'max_meeting_length', 'ai_memory_retention', 'data_export', 'custom_summaries', 'automatic_speaker_recognition', 'data_storage', 'real_time_coaching', 'department_reports', 'api_webhooks', 'video_recording', 'brand_voice', 'crm_integration', 'sso_hipaa_security', 'multi_language_transcripts', 'custom_integrations', 'priority_support', 'advanced_admin_controls', 'custom_data_retention')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_features" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "feature_type" "public"."pricing_features_feature_type_enum" NOT NULL, "label" character varying NOT NULL, "value" text, "is_enabled" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a2bc88284be8bf2a98145aacbf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "addon_bundles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "minutes" integer NOT NULL, "tagline" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f2f8d951b4c4951138d41f2e28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying, "organization_id" uuid NOT NULL, "team_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "google_oauth_refresh_token" character varying, "microsoft_oauth_refresh_token" character varying, "google_calendar_synced_at" TIMESTAMP, "microsoft_calendar_synced_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_51ed3f60fdf013ee5041d2d4d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_resource_type_enum" AS ENUM('reports', 'permissions', 'teams', 'meeting_types', 'report_types')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_access_level_enum" AS ENUM('none', 'read', 'readWrite')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resource_type" "public"."permissions_resource_type_enum" NOT NULL, "resource_id" uuid, "access_level" "public"."permissions_access_level_enum" NOT NULL DEFAULT 'read', "team_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "analysed" boolean NOT NULL DEFAULT false, "bot_id" character varying NOT NULL, "chapters" character varying NOT NULL, "duration_mins" double precision NOT NULL, "host_email" character varying NOT NULL, "meeting_date" TIMESTAMP WITH TIME ZONE, "meeting_url" character varying NOT NULL, "meta_data" jsonb, "participants_email" text array, "summary" character varying NOT NULL, "summary_meta_data" jsonb, "thumbnail" character varying NOT NULL, "title" character varying NOT NULL, "transcript" text, "transcript_json" jsonb, "transcript_url" character varying, "video_url" character varying NOT NULL, "user_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "organization_id" uuid, "meeting_type_id" uuid, CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_subscriptions_status_enum" AS ENUM('active', 'cancelled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "seats_count" integer NOT NULL DEFAULT '1', "status" "public"."organization_subscriptions_status_enum" NOT NULL DEFAULT 'trialing', "current_period_start" TIMESTAMP, "current_period_end" TIMESTAMP, "trial_start" TIMESTAMP, "trial_end" TIMESTAMP, "stripe_subscription_id" character varying, "stripe_customer_id" character varying, "stripe_plan_id" character varying, "stripe_price_id" character varying, "stripe_product_id" character varying, "stripe_checkout_session_id" character varying, "stripe_latest_invoice_id" character varying, "stripe_default_payment_method_id" character varying, "collection_method" character varying, "days_until_due" integer, "billing_cycle_anchor" TIMESTAMP, "pause_collection" boolean NOT NULL DEFAULT false, "livemode" boolean NOT NULL DEFAULT false, "stripe_metadata" jsonb, "canceled_at" TIMESTAMP, "cancel_at_period_end" boolean NOT NULL DEFAULT false, "cancel_at" TIMESTAMP, "ended_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64e17f1dc8ebe056b49e751a494" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_conversation_histories" ("id" SERIAL NOT NULL, "conversation_id" character varying NOT NULL, "message" jsonb NOT NULL, "session_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a9c688004fa2529c130e1c6351" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."calendars_provider_enum" AS ENUM('google', 'microsoft')`,
    );
    await queryRunner.query(
      `CREATE TABLE "calendars" ("id" character varying NOT NULL, "active" boolean, "calender_id" character varying NOT NULL, "email" character varying, "name" character varying, "organization_id" uuid, "resource_id" character varying, "provider" "public"."calendars_provider_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "profile_id" character varying, CONSTRAINT "PK_90dc0330e8ec9028e23c290dee8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_conversation_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "organization_id" uuid, "profile_id" character varying, CONSTRAINT "PK_0de8ea7d779461f99b3bb46246a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "report_type_meeting_types" ("report_type_id" uuid NOT NULL, "meeting_type_id" uuid NOT NULL, CONSTRAINT "PK_708a838d5d8fa9ebc1ac9d99b5b" PRIMARY KEY ("report_type_id", "meeting_type_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_354b84c34b41abd42c00267ee8" ON "report_type_meeting_types" ("report_type_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44f63ebcb14b920a2eb7c6692a" ON "report_type_meeting_types" ("meeting_type_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_fdc736f761896ccc179c823a785" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invites" ADD CONSTRAINT "FK_86ee44dc17238efe40601b14540" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invites" ADD CONSTRAINT "FK_cffa300be3ded59409fdef3fb96" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD CONSTRAINT "FK_e08c0b40ce104f44edf060126fe" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_metrics" ADD CONSTRAINT "FK_d7750531135a4cd4e285dfeddfc" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_types" ADD CONSTRAINT "FK_74a07b4bceaa147d3d6f9d74112" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" ADD CONSTRAINT "FK_a66818357f38d296ba442856751" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" ADD CONSTRAINT "FK_bbb31bcde557e0d1d8c31d599fe" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_cb2c9f20bdbc6f81ddbc18c6378" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_14ad5270911bfd49664ab1bb5ff" FOREIGN KEY ("report_type_id") REFERENCES "report_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_9a489187107505eb31692438181" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" ADD CONSTRAINT "FK_96b5b24b76d97c8390072546466" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_features" ADD CONSTRAINT "FK_79b38bc9a5dd1f5716330a2596b" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_6881b23cd1a8924e4bf61515fbb" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_9dae16cdea66aeba1eb6f6ddf29" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_00d3d2ac2f4fec4083317c5b2d1" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ADD CONSTRAINT "FK_a58833fe5774eb3419e394a8089" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_6679a85ec5bc737351c45b68c09" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_76c3d1c8f6b8ce8c6cefc550318" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_4db10a3304964aecd9cfc238f11" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "FK_ee120ecc7d96135bd947a1ea7ae" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ADD CONSTRAINT "FK_075a36d86f65cd8f4180c2dd241" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" ADD CONSTRAINT "FK_8198d700ecdd4f4005805a9da33" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" ADD CONSTRAINT "FK_354b84c34b41abd42c00267ee8b" FOREIGN KEY ("report_type_id") REFERENCES "report_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" ADD CONSTRAINT "FK_44f63ebcb14b920a2eb7c6692a9" FOREIGN KEY ("meeting_type_id") REFERENCES "meeting_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" DROP CONSTRAINT "FK_44f63ebcb14b920a2eb7c6692a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_type_meeting_types" DROP CONSTRAINT "FK_354b84c34b41abd42c00267ee8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" DROP CONSTRAINT "FK_8198d700ecdd4f4005805a9da33"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendars" DROP CONSTRAINT "FK_075a36d86f65cd8f4180c2dd241"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_subscriptions" DROP CONSTRAINT "FK_ee120ecc7d96135bd947a1ea7ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_4db10a3304964aecd9cfc238f11"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_76c3d1c8f6b8ce8c6cefc550318"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_6679a85ec5bc737351c45b68c09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP CONSTRAINT "FK_a58833fe5774eb3419e394a8089"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_00d3d2ac2f4fec4083317c5b2d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_9dae16cdea66aeba1eb6f6ddf29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_6881b23cd1a8924e4bf61515fbb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_features" DROP CONSTRAINT "FK_79b38bc9a5dd1f5716330a2596b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_events" DROP CONSTRAINT "FK_96b5b24b76d97c8390072546466"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_9a489187107505eb31692438181"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_14ad5270911bfd49664ab1bb5ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_cb2c9f20bdbc6f81ddbc18c6378"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" DROP CONSTRAINT "FK_bbb31bcde557e0d1d8c31d599fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_types" DROP CONSTRAINT "FK_a66818357f38d296ba442856751"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_types" DROP CONSTRAINT "FK_74a07b4bceaa147d3d6f9d74112"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_metrics" DROP CONSTRAINT "FK_d7750531135a4cd4e285dfeddfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT "FK_e08c0b40ce104f44edf060126fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invites" DROP CONSTRAINT "FK_cffa300be3ded59409fdef3fb96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_invites" DROP CONSTRAINT "FK_86ee44dc17238efe40601b14540"`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_fdc736f761896ccc179c823a785"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_44f63ebcb14b920a2eb7c6692a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_354b84c34b41abd42c00267ee8"`,
    );
    await queryRunner.query(`DROP TABLE "report_type_meeting_types"`);
    await queryRunner.query(`DROP TABLE "ai_conversation_sessions"`);
    await queryRunner.query(`DROP TABLE "calendars"`);
    await queryRunner.query(`DROP TYPE "public"."calendars_provider_enum"`);
    await queryRunner.query(`DROP TABLE "ai_conversation_histories"`);
    await queryRunner.query(`DROP TABLE "organization_subscriptions"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_subscriptions_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "meetings"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(
      `DROP TYPE "public"."permissions_access_level_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permissions_resource_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "user_organizations"`);
    await queryRunner.query(`DROP TABLE "addon_bundles"`);
    await queryRunner.query(`DROP TABLE "pricing_features"`);
    await queryRunner.query(
      `DROP TYPE "public"."pricing_features_feature_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "usage_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."usage_events_event_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "pricing_plans"`);
    await queryRunner.query(`DROP TYPE "public"."pricing_plans_tier_enum"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_report_status_enum"`);
    await queryRunner.query(`DROP TABLE "report_types"`);
    await queryRunner.query(`DROP TABLE "meeting_types"`);
    await queryRunner.query(`DROP TABLE "usage_metrics"`);
    await queryRunner.query(
      `DROP TYPE "public"."usage_metrics_metric_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TABLE "organization_invites"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_org_admin"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
  }
}
