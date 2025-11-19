import { NestFactory } from "@nestjs/core";

import { DataSource } from "typeorm";

import { AppModule } from "../app.module";
async function seedProduction() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    //
    const dataSource = app.get(DataSource);

    // Check if pricing data already exists
    const existingPlans = await dataSource.query(
      "SELECT COUNT(*) as count FROM pricing_plans",
    );

    if (parseInt(existingPlans[0].count) > 0) {
      //       return;
    }

    // Pricing data is now hardcoded in frontend, no seeding needed
    //   } catch (error) {
    // this.logger.error("❌ Production seeding failed:", error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seedProduction();
