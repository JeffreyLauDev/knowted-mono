import { MigrationInterface, QueryRunner } from "typeorm";

export class ShareMeetings1755786899029 implements MigrationInterface {
  name = "ShareMeetings1755786899029";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "meeting_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meeting_id" uuid NOT NULL, "share_token" character varying NOT NULL, "created_by" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "is_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5295a6170eeb23f16976ab7af85" UNIQUE ("share_token"), CONSTRAINT "PK_6d7499c447402af52576c07e352" PRIMARY KEY ("id"))`,
    );
    
    // Check if reference column exists before dropping it
    const hasReferenceColumn = await queryRunner.hasColumn("ai_conversation_histories", "reference");
    if (hasReferenceColumn) {
      await queryRunner.query(
        `ALTER TABLE "ai_conversation_histories" DROP COLUMN "reference"`,
      );
    }
    
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ALTER COLUMN "profile_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" DROP COLUMN "conversation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ADD "conversation_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ALTER COLUMN "session_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_shares" ADD CONSTRAINT "FK_4c61a25c50810aac24fc8cd7db7" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_shares" ADD CONSTRAINT "FK_182f81342ada7a3bf2ee0744815" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ADD CONSTRAINT "FK_590acea44ff190d764b35a11b47" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" DROP CONSTRAINT "FK_590acea44ff190d764b35a11b47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" DROP CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_shares" DROP CONSTRAINT "FK_182f81342ada7a3bf2ee0744815"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_shares" DROP CONSTRAINT "FK_4c61a25c50810aac24fc8cd7db7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ALTER COLUMN "session_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" DROP COLUMN "conversation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ADD "conversation_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ALTER COLUMN "profile_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_d1f2344f2a11a872e4596f1fc68" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_sessions" ADD CONSTRAINT "FK_45ba3f75e67e4f8a120e47d57c7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversation_histories" ADD "reference" jsonb`,
    );
    await queryRunner.query(`DROP TABLE "meeting_shares"`);
  }
}
