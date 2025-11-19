import { NestFactory } from "@nestjs/core";

import { AppModule } from "../app.module";
import { SeedingService } from "../services/seeding.service";

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    //
    const seedingService = app.get(SeedingService);
    await seedingService.seedAll();

    //   } catch (error) {
    // this.logger.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seed();
