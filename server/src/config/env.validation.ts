import { plainToClass } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  @IsOptional()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  DB_PORT: number;

  @IsString()
  @IsOptional()
  DB_USERNAME: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD: string;

  @IsString()
  @IsOptional()
  DB_DATABASE: string;

  @IsString()
  @IsOptional()
  DB_SSL_CA: string;

  @IsString()
  @IsOptional()
  DB_SSL_CERT: string;

  @IsString()
  @IsOptional()
  DB_SSL_KEY: string;

  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_SERVICE_KEY: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_JWT_SECRET: string;

  @IsString()
  @IsOptional()
  RETELL_API_KEY: string;

  // MeetingBaas Configuration
  @IsString()
  MEETING_BAAS_API_KEY: string;

  // Stripe Configuration
  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  @IsOptional()
  STRIPE_PERSONAL_PRODUCT_ID: string;

  @IsString()
  @IsOptional()
  STRIPE_BUSINESS_PRODUCT_ID: string;

  @IsString()
  @IsOptional()
  STRIPE_COMPANY_PRODUCT_ID: string;

  // Mailgun Configuration
  @IsString()
  @IsOptional()
  MAILGUN_API_KEY: string;

  @IsString()
  @IsOptional()
  MAILGUN_DOMAIN: string;

  @IsString()
  @IsOptional()
  API_URL: string;

  // Logging Configuration (Optional)
  @IsString()
  @IsOptional()
  LOG_LEVEL: string;

  // OpenSearch Configuration (Optional)
  @IsString()
  @IsOptional()
  OPENSEARCH_ENABLED: string;

  @IsString()
  @IsOptional()
  OPENSEARCH_NODE: string;

  @IsString()
  @IsOptional()
  OPENSEARCH_USERNAME: string;

  @IsString()
  @IsOptional()
  OPENSEARCH_PASSWORD: string;

  @IsString()
  @IsOptional()
  OPENSEARCH_INDEX: string;

  // Internal Service Authentication (for AI agent)
  @IsString()
  @IsOptional()
  INTERNAL_SERVICE_SECRET: string;

  // LangGraph Configuration
  @IsString()
  @IsOptional()
  LANGGRAPH_URL: string;

  // LangSmith Configuration
  @IsString()
  @IsOptional()
  LANGSMITH_API_KEY: string;

  @IsString()
  @IsOptional()
  LANGSMITH_API_URL: string;

  @IsNumber()
  @IsOptional()
  OPENSEARCH_BATCH_SIZE: number;

  @IsNumber()
  @IsOptional()
  OPENSEARCH_FLUSH_INTERVAL: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
