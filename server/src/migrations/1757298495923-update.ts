import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1757298495923 implements MigrationInterface {
  name = "Update1757298495923";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "is_active"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "deleted_at"`);
  }
}
