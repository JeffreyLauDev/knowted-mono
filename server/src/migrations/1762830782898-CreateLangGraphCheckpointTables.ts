import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to create LangGraph checkpoint tables for persistent conversation memory.
 *
 * These tables are used by LangGraph's PostgresSaver to store:
 * - Conversation checkpoints (state snapshots)
 * - Channel data (messages, state)
 * - Write logs for audit trail
 * - Migration tracking
 *
 * Schema matches LangGraph's PostgresSaver setup() method exactly.
 */
export class CreateLangGraphCheckpointTables1762830782898
  implements MigrationInterface
{
  name = "CreateLangGraphCheckpointTables1762830782898";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create checkpoints table - stores checkpoint metadata and state
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkpoints" (
        "thread_id" text NOT NULL,
        "checkpoint_ns" text NOT NULL DEFAULT ''::text,
        "checkpoint_id" text NOT NULL,
        "parent_checkpoint_id" text,
        "type" text,
        "checkpoint" jsonb NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id")
      )
    `);

    // Create checkpoint_blobs table - stores actual channel data (messages, state)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkpoint_blobs" (
        "thread_id" text NOT NULL,
        "checkpoint_ns" text NOT NULL DEFAULT ''::text,
        "channel" text NOT NULL,
        "version" text NOT NULL,
        "type" text NOT NULL,
        "blob" bytea,
        CONSTRAINT "checkpoint_blobs_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "channel", "version")
      )
    `);

    // Create checkpoint_writes table - audit log of checkpoint writes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkpoint_writes" (
        "thread_id" text NOT NULL,
        "checkpoint_ns" text NOT NULL DEFAULT ''::text,
        "checkpoint_id" text NOT NULL,
        "task_id" text NOT NULL,
        "task_path" text,
        "idx" integer NOT NULL,
        "channel" text NOT NULL,
        "type" text,
        "blob" bytea NOT NULL,
        CONSTRAINT "checkpoint_writes_pkey" PRIMARY KEY ("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx")
      )
    `);
    
    // Add task_path column if it doesn't exist (for existing databases)
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'checkpoint_writes' AND column_name = 'task_path'
        ) THEN
          ALTER TABLE "checkpoint_writes" ADD COLUMN "task_path" text;
        END IF;
      END $$;
    `);

    // Create checkpoint_migrations table - tracks schema migrations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checkpoint_migrations" (
        "v" integer NOT NULL,
        CONSTRAINT "checkpoint_migrations_pkey" PRIMARY KEY ("v")
      )
    `);

    // Insert initial migration record if it doesn't exist
    await queryRunner.query(`
      INSERT INTO "checkpoint_migrations" ("v")
      VALUES (1)
      ON CONFLICT ("v") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "checkpoint_migrations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checkpoint_writes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checkpoint_blobs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checkpoints" CASCADE`);
  }
}
