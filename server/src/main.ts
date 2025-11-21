import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { PinoLoggerService } from "./common/logger/pino-logger.service";
import { AppDataSource } from "./datasource";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
    bufferLogs: true, // Buffer logs until Winston logger is ready
  });

  // Get the custom logger service and use it as the main NestJS logger
  const loggerService = app.get(PinoLoggerService);
  app.useLogger(loggerService);

  // Run database migrations automatically if enabled
  const shouldRunMigrations =
    process.env.RUN_MIGRATIONS_ON_STARTUP !== "false" &&
    (process.env.NODE_ENV === "production" ||
      process.env.RUN_MIGRATIONS_ON_STARTUP === "true");

  if (shouldRunMigrations) {
    try {
      loggerService.log("Checking for pending database migrations...", "MIGRATION");
      
      // Initialize the DataSource if not already initialized
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        loggerService.log("Database connection initialized for migrations", "MIGRATION");
      }

      // Run pending migrations (TypeORM only runs migrations that haven't been executed)
      // This is safe - it will only run pending migrations and return an empty array if none are needed
      const executedMigrations = await AppDataSource.runMigrations();
      
      if (executedMigrations && executedMigrations.length > 0) {
        loggerService.log(
          `Successfully executed ${executedMigrations.length} migration(s)`,
          "MIGRATION",
          {
            executedMigrations: executedMigrations.map((m) => m.name),
          },
        );
      } else {
        loggerService.log("Database is up to date - no pending migrations", "MIGRATION");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      loggerService.error(
        `Failed to run database migrations: ${errorMessage}`,
        errorStack,
        "MIGRATION",
      );
      // Don't crash the app if migrations fail - log and continue
      // This allows the app to start even if there's a migration issue
      // The admin can fix it manually
    }
  } else {
    loggerService.log(
      "Automatic migrations are disabled (set RUN_MIGRATIONS_ON_STARTUP=true to enable)",
      "MIGRATION",
    );
  }

  // Get the underlying Express app to configure body size limits
  const expressApp = app.getHttpAdapter().getInstance();

  // Configure body parser with higher limits for large meeting data
  // IMPORTANT: Use raw body parser for webhook endpoints to preserve signature verification
  const bodyParser = require("body-parser");

  // Apply raw body parser for webhook endpoints first - this MUST come before JSON parser
  expressApp.use(
    "/api/v1/stripe/webhook",
    bodyParser.raw({
      type: "application/json",
      limit: "10mb",
    }),
  );

  // Then apply JSON parser for other endpoints
  expressApp.use(bodyParser.json({ limit: "10mb" }));
  expressApp.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // Add logging middleware for webhook debugging
  expressApp.use("/api/v1/stripe/webhook", (req, res, next) => {
    loggerService.log(
      "Webhook middleware - Raw body preserved",
      "STRIPE_WEBHOOK",
      {
        hasRawBody: !!req.body,
        bodyType: typeof req.body,
        bodyLength: req.body?.length,
        contentType: req.headers["content-type"],
        stripeSignature: req.headers["stripe-signature"]
          ? "***PRESENT***"
          : "***MISSING***",
      },
    );
    next();
  });

  // Set timeouts for meeting data endpoints
  expressApp.use((req, res, next) => {
    if (req.url.includes("/complete-meeting-data")) {
      req.setTimeout(300000); // 5 minutes timeout
      res.setTimeout(300000); // 5 minutes timeout
    }
    next();
  });

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Enable CORS with proper configuration for Supabase and WebSocket
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Client-Info",
      "apikey",
      "Prefer",
      "Origin",
      "Accept",
      "X-Requested-With",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    maxAge: 3600,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Internal API Swagger setup (for portal users with JWT)
  const internalConfig = new DocumentBuilder()
    .setTitle("Knowted API - Internal (Portal)")
    .setDescription(
      "Internal API for Knowted Portal. Use JWT Bearer token authentication."
    )
    .setVersion("1.0")
    .addTag("Meetings", "Meeting management")
    .addTag("Meeting Types", "Meeting type management")
    .addTag("Teams", "Team management")
    .addTag("Organizations", "Organization management")
    .addTag("Profiles", "User profile management")
    .addTag("Reports", "Reports and analytics")
    .addTag("Permissions", "Permissions management")
    .addTag("API Keys", "API key management for external integrations")
    .addTag("Auth", "Authentication endpoints")
    .addTag("Health", "System health check endpoints")
    .addTag("N8n Integration", "AI integration endpoints")
    .addTag("Calendar", "Calendar integration")
    .addTag("Payment", "Payment and subscription management")
    .addTag("Webhooks", "Webhook management")
    .addTag("Public Meetings", "Public meeting access (share tokens)")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "access-token",
    )
    .build();

  const internalDocument = SwaggerModule.createDocument(app, internalConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      methodKey,
    deepScanRoutes: true,
  });

  // Filter to include only internal routes (exclude api/external/v1)
  const filteredInternalDocument = {
    ...internalDocument,
    paths: Object.fromEntries(
      Object.entries(internalDocument.paths).filter(
        ([path]) => !path.startsWith("/api/external/")
      )
    ),
  };

  SwaggerModule.setup("api/internal", app, filteredInternalDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      security: [{ "access-token": [] }],
    },
  });

  // External API Swagger setup (for integrations with API Key)
  const externalConfig = new DocumentBuilder()
    .setTitle("Knowted API - External (Integrations)")
    .setDescription(
      "External API for Knowted integrations. Use API Key authentication. " +
      "Generate API keys from the portal at: /api/v1/organizations/:organizationId/api-keys"
    )
    .setVersion("1.0")
    .addTag("Meeting Types", "Get meeting types from your organization")
    .addTag("Meetings", "Query meetings with optional filters")
    .addTag("AI Agent", "Query the AI agent about your meetings")
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "API Key for external integrations (format: kn_live_...)",
      },
      "api-key",
    )
    .build();

  const externalDocument = SwaggerModule.createDocument(app, externalConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      methodKey,
    deepScanRoutes: true,
  });

  // Filter to include only external routes
  const filteredExternalDocument = {
    ...externalDocument,
    paths: Object.fromEntries(
      Object.entries(externalDocument.paths).filter(([path]) =>
        path.startsWith("/api/external/")
      )
    ),
  };

  // Serve OpenAPI JSON for Scalar to consume
  expressApp.get("/api/external-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(filteredExternalDocument);
  });

  // Serve Scalar documentation UI instead of Swagger UI
  expressApp.get("/api/external", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>Knowted API - External (Integrations)</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${baseUrl}/api/external-json"
      data-configuration='{
        "theme": "default",
        "layout": "modern",
        "searchHotKey": "k",
        "hideDownloadButton": false,
        "servers": [
          {
            "url": "${baseUrl}",
            "description": "Knowted API Server"
          }
        ]
      }'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest"></script>
  </body>
</html>
    `);
  });

  // Start the application
  const port = process.env.PORT || 3000;
  await app.listen(port);
  loggerService.log(
    `Application is running on: http://localhost:${port}`,
    "BOOTSTRAP",
  );
}
bootstrap();
