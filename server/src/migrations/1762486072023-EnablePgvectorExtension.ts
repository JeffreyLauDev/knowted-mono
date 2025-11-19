import { MigrationInterface, QueryRunner } from "typeorm";

export class EnablePgvectorExtension1762486072023 implements MigrationInterface {
    name = "EnablePgvectorExtension1762486072023";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable pgvector extension for vector similarity search
        // This is required for RAG (Retrieval Augmented Generation) functionality
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop pgvector extension (be careful - this will remove all vector data)
        await queryRunner.query(`DROP EXTENSION IF EXISTS vector CASCADE;`);
    }
}
