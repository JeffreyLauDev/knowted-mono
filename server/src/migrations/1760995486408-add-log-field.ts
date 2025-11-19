import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogField1760995486408 implements MigrationInterface {
    name = 'AddLogField1760995486408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "log" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "log"`);
    }

}
