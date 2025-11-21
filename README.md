# Knowted Monorepo

A monorepo containing all Knowted services and applications.

## Structure

```
.
├── client/          # React frontend application
├── server/          # NestJS backend API
├── meetingbot/      # Meeting bot service (NestJS microservice)
├── aiagent/         # LangGraph AI agents (Python)
└── utils/           # Shared utilities and scripts
```

## Services

### Client (`client/`)
- **Tech Stack**: React, TypeScript, Vite, Tailwind CSS
- **Deployment**: Vercel
- **Port**: 8080 (dev)

### Server (`server/`)
- **Tech Stack**: NestJS, TypeScript, PostgreSQL, TypeORM
- **Deployment**: DigitalOcean App Platform
- **Port**: 3000 (dev)

### Meetingbot (`meetingbot/`)
- **Tech Stack**: NestJS, TypeScript
- **Purpose**: Meeting bot scheduling and management
- **Deployment**: DigitalOcean App Platform

### AI Agent (`aiagent/`)
- **Tech Stack**: Python, LangGraph, LangChain
- **Purpose**: AI-powered meeting analysis and insights
- **Deployment**: DigitalOcean App Platform

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) - Runtime version manager
  - Automatically installs Node.js 20, Python 3.11, and pnpm 9
  - No need to manually install these tools!
- Docker (optional, for local Supabase)

### Quick Setup

1. **Install mise** (if not already installed):
```bash
# macOS/Linux
curl https://mise.run | sh

# Or using Homebrew
brew install mise
```

2. **Clone the repository**:
```bash
git clone https://github.com/JeffreyLauDev/knowted-mono.git
cd knowted-mono
```

3. **Run the setup command** (installs all dependencies and starts Supabase):
```bash
mise run setup
```

This will:
- ✅ Install Node.js 20 and pnpm 9 (via mise)
- ✅ Install Python 3.11 (via mise)
- ✅ Install all client and server dependencies
- ✅ Start Supabase local database

4. **Set up environment variables**:
```bash
# Copy example files and fill in your values
cp server/.env.example server/.env
cp client/.env.example client/.env
cp aiagent/.env.example aiagent/.env
```

5. **Start the development environment**:
```bash
# Start everything (database, server, client, AI agent)
mise run dev
```

### Available Commands

#### Development
- `mise run dev` - Start everything (database, server, client, AI agent)
- `mise run server` - Start backend server only (port 3000)
- `mise run client` - Start frontend client only (port 8080)
- `mise run aiagent` - Start AI agent only (port 2024)

#### Setup & Installation
- `mise run setup` - Full setup (install dependencies + start Supabase)
- `mise run install` - Install all dependencies
- `mise run aiagent:setup` - Setup Python virtual environment for AI agent
- `mise run aiagent:install:requirements` - Install AI agent Python dependencies

#### Database (Supabase)
- `mise run db` - Start Supabase local database
- `mise run db:stop` - Stop Supabase
- `mise run db:status` - Show Supabase status
- `mise run db:reset` - Reset database (⚠️ destroys all data)
- `mise run logs` - View Supabase logs

#### Code Generation
- `mise run generate:api` - Generate API types from backend OpenAPI spec
- `mise run generate:api:watch` - Watch and regenerate API types on changes
- `mise run supabase:types` - Generate Supabase TypeScript types

#### Testing & Quality
- `mise run test` - Run all tests
- `mise run test:watch` - Run tests in watch mode
- `mise run lint` - Run linters
- `mise run build` - Build both server and client for production

#### Shortcuts
- `mise run s` - Alias for `setup`
- `mise run d` - Alias for `dev`

## Environment Variables

Each service requires its own `.env` file. See:
- `server/.env.example`
- `client/.env.example`
- `aiagent/.env.example`

**⚠️ Never commit `.env` files to the repository!**

## Development

### Running Tests

```bash
# Run all tests
mise run test

# Run tests in watch mode
mise run test:watch
```

### Database Migrations

```bash
# Make sure Supabase is running first
mise run db

# Then run migrations
cd server && pnpm run migration:run
```

### Generating API Types

When backend API changes, regenerate frontend types:

```bash
# Generate once
mise run generate:api

# Or watch for changes
mise run generate:api:watch
```

## Deployment

Deployments are handled via GitHub Actions. See `.github/workflows/` for CI/CD pipelines.

- **Frontend**: Auto-deploys to Vercel on push to `dev` branch
- **Backend**: Builds Docker image and deploys to DigitalOcean on push to `dev` branch
- **AI Agent**: Builds Docker image and deploys to DigitalOcean on push to `dev` branch
- **Database Migrations**: Auto-run on `dev` branch, manual for production

## Contributing

1. Create a feature branch from `main` or `dev`
2. Make your changes
3. Run tests: `mise run test`
4. Run linter: `mise run lint`
5. Submit a pull request to `dev`

## Security

- All `.env` files are gitignored
- Never commit secrets, API keys, or credentials
- Use GitHub Secrets for CI/CD
- Review `.gitignore` before committing

## License

Proprietary - All rights reserved

