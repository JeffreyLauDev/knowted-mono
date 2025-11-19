import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamIdToMeetings1754271702917 implements MigrationInterface {
  name = "AddTeamIdToMeetings1754271702917";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if team_id column already exists
    const hasTeamIdColumn = await queryRunner.hasColumn("meetings", "team_id");

    if (!hasTeamIdColumn) {
      await queryRunner.query(`ALTER TABLE "meetings" ADD "team_id" uuid`);
    }

    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_6679a85ec5bc737351c45b68c09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meetings" ADD CONSTRAINT "FK_6679a85ec5bc737351c45b68c09" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Only add the foreign key constraint if we added the column
    if (!hasTeamIdColumn) {
      await queryRunner.query(
        `ALTER TABLE "meetings" ADD CONSTRAINT "FK_7d3c090068fcb4fe1a946b9b7e8" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_7d3c090068fcb4fe1a946b9b7e8"`,
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
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "team_id"`);
  }
}
