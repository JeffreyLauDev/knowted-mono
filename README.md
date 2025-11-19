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

- Node.js 18+
- Python 3.11+
- pnpm
- PostgreSQL
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JeffreyLauDev/knowted-mono.git
cd knowted-mono
```

2. Install dependencies for each service:
```bash
# Backend
cd server && pnpm install && cd ..

# Frontend
cd client && pnpm install && cd ..

# AI Agent
cd aiagent && pip install -r requirements.txt && cd ..
```

3. Set up environment variables:
```bash
# Copy example files and fill in your values
cp server/.env.example server/.env
cp client/.env.example client/.env
cp aiagent/.env.example aiagent/.env
```

4. Start development servers:
```bash
# Using mise (recommended)
mise run dev

# Or manually:
# Terminal 1: Backend
cd server && pnpm start:dev

# Terminal 2: Frontend
cd client && pnpm start:dev

# Terminal 3: AI Agent
cd aiagent && source venv/bin/activate && langgraph dev --port 2024
```

## Environment Variables

Each service requires its own `.env` file. See:
- `server/.env.example`
- `client/.env.example`
- `aiagent/.env.example`

**⚠️ Never commit `.env` files to the repository!**

## Development

### Running Tests

```bash
# Backend tests
cd server && pnpm test

# Frontend tests
cd client && pnpm test
```

### Database Migrations

```bash
cd server
pnpm run migration:run
```

## Deployment

Deployments are handled via GitHub Actions. See `.github/workflows/` for CI/CD pipelines.

- **Frontend**: Auto-deploys to Vercel on push to `dev` branch
- **Backend**: Builds Docker image and deploys to DigitalOcean on push to `dev` branch
- **AI Agent**: Builds Docker image and deploys to DigitalOcean on push to `dev` branch
- **Database Migrations**: Auto-run on `dev` branch, manual for production

## Contributing

1. Create a feature branch from `dev`
2. Make your changes
3. Ensure tests pass
4. Submit a pull request to `dev`

## Security

- All `.env` files are gitignored
- Never commit secrets, API keys, or credentials
- Use GitHub Secrets for CI/CD
- Review `.gitignore` before committing

## License

Proprietary - All rights reserved

