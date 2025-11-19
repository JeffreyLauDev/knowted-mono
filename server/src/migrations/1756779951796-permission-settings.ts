import { MigrationInterface, QueryRunner } from "typeorm";

export class PermissionSettings1756779951796 implements MigrationInterface {
  name = "PermissionSettings1756779951796";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."permissions_resource_type_enum" RENAME TO "permissions_resource_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_resource_type_enum" AS ENUM('reports', 'permissions', 'teams', 'users', 'billing', 'calendar', 'organization', 'meeting_types', 'report_types')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "resource_type" TYPE "public"."permissions_resource_type_enum" USING "resource_type"::"text"::"public"."permissions_resource_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permissions_resource_type_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_resource_type_enum_old" AS ENUM('meeting_types', 'permissions', 'report_types', 'reports', 'teams')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "resource_type" TYPE "public"."permissions_resource_type_enum_old" USING "resource_type"::"text"::"public"."permissions_resource_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permissions_resource_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."permissions_resource_type_enum_old" RENAME TO "permissions_resource_type_enum"`,
    );
  }
}
