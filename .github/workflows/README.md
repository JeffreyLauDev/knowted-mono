# CI/CD Workflows

This directory contains GitHub Actions workflows for the Knowted monorepo.

## Workflows

### `ci.yml` - Continuous Integration
- **Triggers**: Pull requests and pushes to main/dev/develop/production
- **Purpose**: Run tests and checks for changed services
- **Features**:
  - Path-based filtering (only tests changed services)
  - Runs backend, frontend, and AI agent tests separately
  - Fast feedback on PRs

### `backend.yml` - Backend Deployment
- **Triggers**: Push to dev/develop/production when `server/**` changes
- **Purpose**: Build and deploy NestJS backend to DigitalOcean
- **Steps**:
  1. Run tests
  2. Build Docker image
  3. Push to DigitalOcean Container Registry
  4. Auto-deploys via DigitalOcean App Platform

### `frontend.yml` - Frontend Deployment
- **Triggers**: Push to dev/develop/production when `client/**` changes
- **Purpose**: Build and deploy React frontend to Vercel
- **Steps**:
  1. Run tests
  2. Build project
  3. Deploy to Vercel (preview for dev, production for main)

### `migrations.yml` - Database Migrations
- **Triggers**: 
  - Push when `server/src/migrations/**` changes (auto-runs on dev)
  - Manual workflow_dispatch for production
- **Purpose**: Run TypeORM migrations on Supabase
- **Features**:
  - Auto-runs on dev branch
  - Manual approval required for production
  - Supports rollback for production

### `aiagent.yml` - AI Agent Deployment
- **Triggers**: Push to dev/develop/production when `aiagent/**` changes
- **Purpose**: Build and deploy Python AI agent to DigitalOcean
- **Steps**:
  1. Run tests (if available)
  2. Build Docker image
  3. Push to DigitalOcean Container Registry

## Path-Based Filtering

All workflows use path-based filtering to only run when relevant files change:

- `server/**` → Backend workflow
- `client/**` → Frontend workflow
- `aiagent/**` → AI Agent workflow
- `server/src/migrations/**` → Migrations workflow

## Environments

### Development
- **Branch**: `dev` or `develop`
- **Auto-deploys**: Yes
- **Auto-migrations**: Yes (dev only)
- **Approval required**: No

### Production
- **Branch**: `production`
- **Auto-deploys**: Yes
- **Auto-migrations**: No (manual only)
- **Approval required**: Yes (for migrations)

## Required Secrets

### DigitalOcean
- `DIGITALOCEAN_ACCESS_TOKEN` - For container registry

### Vercel
- `VERCEL_TOKEN` - For frontend deployments
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### Database (Dev)
- `DEV_DB_HOST`
- `DEV_DB_PORT`
- `DEV_DB_USERNAME`
- `DEV_DB_PASSWORD`
- `DEV_DB_DATABASE`

### Database (Production)
- `PROD_DB_HOST`
- `PROD_DB_PORT`
- `PROD_DB_USERNAME`
- `PROD_DB_PASSWORD`
- `PROD_DB_DATABASE`

## Pre-commit Hooks

Pre-commit hooks are configured at the root level (`.husky/pre-commit`) and automatically run:
- TypeScript type checking for changed services
- Unit tests for changed services
- Python syntax checks for AI agent changes

## Setup

1. Install husky at root: `pnpm install` (installs husky)
2. Initialize husky: `pnpm prepare` (sets up git hooks)
3. Hooks will run automatically on commit

