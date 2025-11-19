import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfileTrigger1751949776646 implements MigrationInterface {
  name = "CreateProfileTrigger1751949776646";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a trigger function that will be called when a new user is created
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, created_at, updated_at)
        VALUES (new.id, new.email, now(), now());
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create the trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.handle_new_user()`);
  }
}
