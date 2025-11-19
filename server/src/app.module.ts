import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Request, Response } from "express";
import { LoggerModule as NestPinoLoggerModule } from "nestjs-pino";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { FeatureGuard } from "./common/guards/feature.guard";
import { MonthlyMinutesGuard } from "./common/guards/monthly-minutes.guard";
import { QuotaGuard } from "./common/guards/quota.guard";
import { SeatLimitGuard } from "./common/guards/seat-limit.guard";
import { OpenSearchLoggingInterceptor } from "./common/interceptors/opensearch-logging.interceptor";
import { setupGlobalLoggerOverride } from "./common/logger/global-logger.override";
import { PinoLoggerModule } from "./common/logger/pino-logger.module";
import { ValidationPipe } from "./common/pipes/validation.pipe";
import {
  appConfig,
  databaseConfig,
  opensearchConfig,
  supabaseConfig,
} from "./config/configuration";
import { validate } from "./config/env.validation";
import { usageConfig } from "./config/usage.config";
import { AiModule } from "./modules/ai/ai.module";
import { AiConversationSessionsModule } from "./modules/ai_conversation_sessions/ai_conversation_sessions.module";
import { AiFeedbackModule } from "./modules/ai_feedback/ai-feedback.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { EmailModule } from "./modules/email/email.module";
import { HealthModule } from "./modules/health/health.module";
import { MeetingTypesModule } from "./modules/meeting_types/meeting_types.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { OrganizationSubscriptionsModule } from "./modules/organization-subscriptions/organization-subscriptions.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { ReportTypesModule } from "./modules/report_types/report_types.module";
import { SeatManagementModule } from "./modules/seat-management/seat-management.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { UsageEventsModule } from "./modules/usage-events/usage-events.module";
import { UsageMetricsModule } from "./modules/usage-metrics/usage-metrics.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { OpenSearchLoggerService } from "./services/opensearch-logger.service";
import { SeedingService } from "./services/seeding.service";
import { SlackNotificationService } from "./services/slack-notification.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [
        appConfig,
        databaseConfig,
        supabaseConfig,
        usageConfig,
        opensearchConfig,
      ],
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
    }),
    NestPinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const opensearchConfig = configService.get("opensearch");
        const isProduction =
          configService.get("app.environment") === "production";
        const isOpenSearchEnabled = opensearchConfig?.enabled;

        // Build transport configuration
        let transport;
        if (isOpenSearchEnabled && isProduction) {
          // OpenSearch transport configuration for production

          // Production with OpenSearch enabled - use console transport
          // Custom OpenSearch logging will be handled by the interceptor
          transport = {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers",
              singleLine: false,
              hideObject: false,
            },
          };
        } else if (!isProduction) {
          // Development without OpenSearch - use pretty printing only
          transport = {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers",
              singleLine: false,
              hideObject: false,
            },
          };
        }
        // Production without OpenSearch - no transport (stdout)

        return {
          pinoHttp: {
            // Set level to 'warn' so that 'info' and 'silent' levels are filtered out
            // Only 'warn' and 'error' will be logged
            level: "warn",
            transport,
            // Use autoLogging with ignore function to skip successful requests
            // The ignore function is called before response, so we can't check statusCode
            // Instead, we'll use customLogLevel to filter after response
            autoLogging: true,
            // Custom serializers to reduce verbosity - only include essential fields
            serializers: {
              req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                path: req.url?.split("?")[0],
                query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
                remoteAddress: req.ip || req.connection?.remoteAddress,
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
              err: (err: any) => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
            // Remove custom formatters when using multiple transports (OpenSearch enabled)
            ...(isOpenSearchEnabled
              ? {}
              : {
                  formatters: {
                    level: (label: string) => {
                      return { level: label };
                    },
                  },
                  customProps: (
                    req: Request & {
                      user?: { id: string; organizationId: string };
                      id: string;
                    },
                  ) => ({
                    userId: req.user?.id,
                    organizationId: req.user?.organizationId,
                    requestId: req.id,
                  }),
                  // Use customLogLevel to filter - return a level higher than the logger level for successful requests
                  customLogLevel: (
                    req: Request,
                    res: Response,
                    err?: Error,
                  ) => {
                    // Only log 4xx, 5xx, and errors
                    if (res.statusCode >= 400 && res.statusCode < 500) {
                      return "warn";
                    } else if (res.statusCode >= 500 || err) {
                      return "error";
                    }
                    // For successful requests, return a level that won't be logged
                    // Set logger level to 'warn' or higher, or return a level that's filtered out
                    return "silent";
                  },
                }),
          },
          // Add global logger configuration to capture ALL internal logs
          ...(isOpenSearchEnabled && isProduction
            ? {
                logger: {
                  level: configService.get("LOG_LEVEL", "info"),
                  transport: {
                    target: "pino-pretty",
                    options: {
                      colorize: true,
                      translateTime: "SYS:standard",
                      ignore: "pid,hostname,req.headers,req.remoteAddress,req.remotePort,res.headers",
                      singleLine: false,
                      hideObject: false,
                    },
                  },
                },
              }
            : {}),
        };
      },
      inject: [ConfigService],
    }),
    PinoLoggerModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger("DatabaseConfig");
        const dbConfig = configService.get("database");
        
        // Enable SSL for any external database connection (not localhost)
        const isExternalDatabase = dbConfig.host !== "127.0.0.1" && 
                                 dbConfig.host !== "localhost" && 
                                 !dbConfig.host.includes("127.0.0.1");

        logger.log(
          `Database configuration: ${JSON.stringify({
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.name,
            synchronize: dbConfig.synchronize,
            ssl: isExternalDatabase ? "enabled" : "disabled",
          })}`,
        );

        return {
          type: "postgres",
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          synchronize: dbConfig.synchronize,
          ssl: isExternalDatabase
            ? {
                rejectUnauthorized: false,
                sslmode: 'require',
              }
            : false,
          logging: ["error", "warn", "schema"],
          logger: "advanced-console",
          // Connection pool settings for external databases
          extra: isExternalDatabase ? {
            max: 20,
            min: 5,
            acquireTimeoutMillis: 60000,
            idleTimeoutMillis: 600000,
            connectionTimeoutMillis: 20000,
          } : {},
          // Retry configuration
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    CalendarModule,
    EmailModule,
    OrganizationsModule,
    TeamsModule,
    MeetingTypesModule,
    MeetingsModule,
    ReportTypesModule,
    PermissionsModule,
    ProfilesModule,
    AiConversationSessionsModule,
    AiFeedbackModule,
    OrganizationSubscriptionsModule,
    UsageMetricsModule,
    UsageEventsModule,
    PaymentModule,
    PricingModule,
    SeatManagementModule,
    AiModule,
    HealthModule,
    WebhooksModule,
    ApiKeysModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: QuotaGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SeatLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MonthlyMinutesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OpenSearchLoggingInterceptor,
    },
    SeedingService,
    OpenSearchLoggerService,
    SlackNotificationService,
    {
      provide: "GLOBAL_LOGGER_SETUP",
      useFactory: (
        configService: ConfigService,
        opensearchLogger: OpenSearchLoggerService,
        slackService: SlackNotificationService,
      ) => {
        setupGlobalLoggerOverride(
          configService,
          opensearchLogger,
          slackService,
        );
        return true;
      },
      inject: [
        ConfigService,
        OpenSearchLoggerService,
        SlackNotificationService,
      ],
    },
  ],
  controllers: [],
})
export class AppModule {}
