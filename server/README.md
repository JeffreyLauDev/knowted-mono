# Knowted Backend

A NestJS backend for the Knowted platform, supporting AI-powered meeting analysis, conversation management, and multi-tenant organization management with Supabase integration.

## Features

- **Multi-tenant Architecture** - Organization-based access control and data isolation
- **AI Meeting Analysis** - Automated meeting transcription, summarization, and insights
- **Conversation Management** - Track and analyze AI conversation sessions
- **Calendar Integration** - Google Calendar OAuth for meeting scheduling
- **Payment Processing** - Stripe integration for subscription management
- **Role-based Access Control** - Fine-grained permissions system
- **Team Management** - Organization teams with custom permissions
- **Usage Tracking** - Monitor API usage and seat allocation
- **Swagger API Documentation** - Interactive API documentation

## Prerequisites

- Node.js (v18 or later)
- PostgreSQL database (via Supabase)
- Docker and Docker Compose (for production deployment)
- Stripe account (for payments)
- Google Cloud Console (for Calendar OAuth)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=knowted
DB_SSL_CA=
DB_SSL_CERT=
DB_SSL_KEY=

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# External Services
RETELL_API_KEY=your_retell_api_key
MEETING_BAAS_API_KEY=your_meeting_baas_api_key

# Email Configuration (Mailgun)
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Redis Configuration
REDIS_PASSWORD=your_redis_password

# Usage Limits Configuration
FREE_TRIAL_MONTHLY_MINUTES=300
FREE_TRIAL_SEAT_COUNT=1
PERSONAL_MINUTES_PER_SEAT=1500
BUSINESS_MINUTES_PER_SEAT=3000
COMPANY_MINUTES_PER_SEAT=6000
CUSTOM_MINUTES_PER_SEAT=10000
DEFAULT_MONTHLY_MINUTES=300
DEFAULT_SEAT_COUNT=1
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/knowted-backend.git
cd knowted-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp env.example .env
# Edit .env with your actual values
```

4. Start the development server:
```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`.

## Database Setup

### Development
```bash
# Run migrations
npm run migration:run

# Seed the database with initial data
npm run seed
```

### Production
```bash
# Deploy with automatic migrations and seeding
./deploy.sh
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at `http://localhost:3000/api`.

## Project Structure

```
src/
├── modules/                    # Feature modules
│   ├── auth/                  # Authentication & OAuth
│   ├── organizations/         # Organization management
│   ├── teams/                 # Team management
│   ├── permissions/           # Role-based access control
│   ├── meetings/              # Meeting management
│   ├── meeting_types/         # Meeting type templates
│   ├── reports/               # Report generation
│   ├── report_types/          # Report type templates
│   ├── profiles/              # User profiles
│   ├── calendars/             # Calendar integration
│   ├── payment/               # Stripe payment processing
│   ├── pricing/               # Pricing plans and features
│   ├── ai_conversation_sessions/ # AI conversation tracking
│   ├── usage-events/          # Usage tracking
│   └── usage-metrics/         # Usage analytics
├── common/                    # Shared utilities
│   ├── decorators/           # Custom decorators
│   ├── filters/              # Exception filters
│   ├── guards/               # Authentication guards
│   └── pipes/                # Validation pipes
├── config/                   # Configuration
├── database/                 # Database setup
│   └── seeds/               # Seed data files
├── migrations/               # Database migrations
├── services/                 # Shared services
├── scripts/                  # Utility scripts
└── main.ts                   # Application entry point
```

## Database Seeding

The application uses a separate seeding system for initial data:

### Seed Data Structure
```
src/database/seeds/
├── README.md                 # Seeding documentation
├── pricing.seed.ts          # Pricing plans and features
└── [future-seeds].ts        # Other seed data
```

### Running Seeds
```bash
# Development seeding (with console output)
npm run seed

# Production seeding (safe, checks existing data)
npm run seed:prod
```

### Adding New Seeds
1. Create a new seed file in `src/database/seeds/`
2. Export a function that takes a `DataSource` parameter
3. Use transactions for data consistency
4. Add the seed to `SeedingService.seedAll()`

## Module Creation

To maintain consistency across the codebase, we use a custom script to generate new modules:

```bash
npm run create:module <module-name>
```

For example:
```bash
npm run create:module users
```

This generates a complete CRUD structure with:
- Module file with proper imports
- Controller with CRUD endpoints
- Service with database integration
- DTOs (Data Transfer Objects)
- Entity file
- TypeScript types and decorators

## Deployment

### Development
```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Or run locally
npm run start:dev
```

### Production
```bash
# Deploy to production
./deploy.sh
```

The deployment script automatically:
1. Stops existing containers
2. Builds new images
3. Runs database migrations
4. Seeds initial data
5. Starts the application
6. Performs health checks

### Docker Commands
```bash
# Build production image
npm run docker:build

# Push to registry
npm run docker:push

# View running containers
docker-compose -f docker-compose.prod.yml ps
```

## Database Management

### Migrations
```bash
# Generate new migration
npm run migration:generate src/migrations/migration-name

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Schema Management
```bash
# Sync schema (development only)
npm run schema:sync

# Log schema changes
npm run schema:log
```

## Security

- **JWT Authentication** - All endpoints protected with Supabase JWT
- **Organization Isolation** - Multi-tenant data separation
- **Role-based Access Control** - Fine-grained permissions
- **Input Validation** - Class-validator for all inputs
- **Environment Variables** - Secure configuration management
- **CORS Protection** - Configured for production use

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. # CI/CD Test
