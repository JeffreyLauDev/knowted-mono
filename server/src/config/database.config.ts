import { config } from "dotenv";

// Only load .env files in local development, not in CI environments
if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
  const envFile =
    process.env.NODE_ENV === "production" ? ".env.production" : ".env";
  config({ path: envFile });
}

// Single source of truth for database configuration
export const getDatabaseConfig = () => {
  const dbHost = process.env.DB_HOST || "127.0.0.1";
  const dbPort = parseInt(process.env.DB_PORT || "5432", 10);
  const dbUsername = process.env.DB_USERNAME || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "postgres";
  const dbDatabase = process.env.DB_DATABASE || "postgres";

  return {
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: dbDatabase,
  };
};
