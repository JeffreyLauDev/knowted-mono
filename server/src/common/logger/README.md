# Pino Logger Service

This module provides structured logging with Pino for the Knowted backend, replacing the previous Winston-based logger.

## Features

- **Structured Logging**: JSON format with searchable fields
- **HTTP Request Logging**: Automatic logging of all HTTP requests with response times
- **Endpoint-based Logging**: Each request is logged with method, URL, status code, and response time
- **User Context**: Automatic inclusion of user ID and organization ID in logs
- **Performance Optimized**: Fast, low-overhead logging
- **Development-friendly**: Pretty-printed logs in development mode

## Configuration

The logger is configured in `app.module.ts` with the following features:

- **Development Mode**: Pretty-printed logs with colors and timestamps
- **Production Mode**: Structured JSON logs for log aggregation
- **Request Logging**: Automatic HTTP request/response logging
- **Custom Properties**: User ID, organization ID, and request ID included in all logs

## Usage

### Basic Logging

```typescript
import { PinoLoggerService } from '../common/logger/pino-logger.service';

@Injectable()
export class YourService {
  constructor(private readonly logger: PinoLoggerService) {}

  async someMethod() {
    this.logger.log('Operation started', 'YourService');
    this.logger.warn('Warning message', 'YourService', { userId: '123' });
    this.logger.error('Error occurred', 'stack trace', 'YourService');
  }
}
```

### Structured Logging

```typescript
// Business events
this.logger.logBusinessEvent('user_registration', {
  userId: '123',
  email: 'user@example.com',
  plan: 'business'
});

// Authentication events
this.logger.logAuthEvent('login_success', 'user123', {
  loginMethod: 'email',
  ip: '192.168.1.1'
});

// Payment events
this.logger.logPaymentEvent('subscription_created', 'user123', 'org456', {
  plan: 'business',
  amount: 29.99
});

// Security events
this.logger.logSecurityEvent('failed_login_attempt', 'medium', {
  ip: '192.168.1.1',
  attempts: 3
});

// Performance logging
this.logger.logPerformance('database_query', 150, {
  query: 'SELECT * FROM users',
  table: 'users'
});
```

## HTTP Request Logging

All HTTP requests are automatically logged with:

- Method and URL
- Response status code
- Response time in milliseconds
- User agent
- IP address
- User ID and organization ID (when available)
- Request ID for tracing

## Log Levels

- `log()` - Info level logging
- `error()` - Error level logging with optional stack trace
- `warn()` - Warning level logging
- `debug()` - Debug level logging
- `verbose()` - Trace level logging

## Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info  # debug, info, warn, error
```

## Migration from Winston

The new Pino logger service maintains the same interface as the previous Winston logger, so no changes are needed in existing service code. The main benefits of the migration:

1. **Better Performance**: Pino is significantly faster than Winston
2. **Automatic HTTP Logging**: Built-in request/response logging by endpoint
3. **Better Structured Logs**: More consistent JSON structure
4. **Reduced Dependencies**: Fewer packages and simpler configuration
