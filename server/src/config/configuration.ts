import { registerAs } from "@nestjs/config";
import { getDatabaseConfig } from "./database.config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || "development",
}));

export const databaseConfig = registerAs("database", () => {
  const dbConfig = getDatabaseConfig();
  return {
    ...dbConfig,
    name: dbConfig.database, // NestJS expects 'name' instead of 'database'
    synchronize: process.env.NODE_ENV === "development", // ENABLED for local testing
  };
});

export const supabaseConfig = registerAs("supabase", () => ({
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  anonKey: process.env.SUPABASE_ANON_KEY,
  jwtSecret: process.env.SUPABASE_JWT_SECRET,
}));

export const retellConfig = registerAs("retell", () => ({
  apiKey: process.env.RETELL_API_KEY,
}));

export const meetingBaasConfig = registerAs("meetingBaas", () => ({
  apiKey: process.env.MEETING_BAAS_API_KEY,
}));

export const mailgunConfig = registerAs("mailgun", () => ({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
}));

export const opensearchConfig = registerAs("opensearch", () => ({
  enabled: process.env.OPENSEARCH_ENABLED === "true",
  node: process.env.OPENSEARCH_NODE,
  username: process.env.OPENSEARCH_USERNAME,
  password: process.env.OPENSEARCH_PASSWORD,
  index: process.env.OPENSEARCH_INDEX || "knowted-logs",
  batchSize: parseInt(process.env.OPENSEARCH_BATCH_SIZE, 10) || 100,
  flushInterval: parseInt(process.env.OPENSEARCH_FLUSH_INTERVAL, 10) || 5000,
}));
