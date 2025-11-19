import { join } from "path";
import { DataSource } from "typeorm";
import { getDatabaseConfig } from "./src/config/database.config";

// Get database configuration from shared source
const dbConfig = getDatabaseConfig();

export default new DataSource({
  type: "postgres",
  ...dbConfig,
  synchronize: false,
  logging: ["error", "warn", "schema"],
  entities: [join(process.cwd(), "src/**/*.entity.{ts,js}")],
  migrations: [join(process.cwd(), "src/migrations/*.{ts,js}")],
  subscribers: [],
});
