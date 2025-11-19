import { Injectable } from "@nestjs/common";

import { DataSource } from "typeorm";

@Injectable()
export class SeedingService {
  constructor(private dataSource: DataSource) {}

  async seedAll(): Promise<void> {
    // Pricing data is now hardcoded in frontend, no seeding needed
  }

  async resetAndSeed(): Promise<void> {
    // Pricing data is now hardcoded in frontend, no seeding needed
  }
}
