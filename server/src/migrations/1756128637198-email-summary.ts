import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailSummary1756128637198 implements MigrationInterface {
  name = "EmailSummary1756128637198";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD "email_summary" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_6679a85ec5bc737351c45b68c09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_6679a85ec5bc737351c45b68c09" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_6679a85ec5bc737351c45b68c09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_6679a85ec5bc737351c45b68c09" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP COLUMN "email_summary"`,
    );
  }
}
