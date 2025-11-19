import { MigrationInterface, QueryRunner } from "typeorm";

export class VideoProcessingStatusField1758001626964 implements MigrationInterface {
    name = 'VideoProcessingStatusField1758001626964'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "video_processing_status" character varying DEFAULT 'none'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "video_processing_status"`);
    }

}
