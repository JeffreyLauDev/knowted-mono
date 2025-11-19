# CI/CD Setup Guide

## Overview

The monorepo CI/CD is now set up with separate workflows for each service, integrated with:
- **Vercel** for frontend deployments
- **DigitalOcean Container Registry** for backend and AI agent deployments
- **Supabase** for database migrations

## What Was Created

### 1. GitHub Actions Workflows (`.github/workflows/`)

- **`ci.yml`** - Runs tests on PRs and pushes (path-based filtering)
- **`backend.yml`** - Deploys backend to DigitalOcean (triggers on `server/**` changes)
- **`frontend.yml`** - Deploys frontend to Vercel (triggers on `client/**` changes)
- **`migrations.yml`** - Runs database migrations (triggers on `server/src/migrations/**` changes)
- **`aiagent.yml`** - Deploys AI agent to DigitalOcean (triggers on `aiagent/**` changes)

### 2. Pre-commit Hooks (`.husky/`)

- **`.husky/pre-commit`** - Runs type checking and tests for changed services
- Automatically detects which services changed and runs appropriate checks

### 3. Root Package.json

- Added for husky setup at monorepo root
- Enables pre-commit hooks across the entire monorepo

## What Needs to Be Cleaned Up

### Old Files to Remove

1. **`server/.github/workflows/deploy.yml`** - Old workflow (replaced by root workflows)
2. **`server/.husky/pre-commit`** - Old pre-commit hook (replaced by root hook)

### Optional Cleanup

- Consider removing `server/.github/` directory entirely if not needed
- The old workflow can be deleted once you verify the new workflows work

## Setup Steps

### 1. Install Husky at Root

```bash
# Install husky
pnpm install

# Initialize git hooks
pnpm prepare
```

### 2. Configure GitHub Secrets

Go to: `Settings → Secrets and variables → Actions`

Add these secrets:

**DigitalOcean:**
- `DIGITALOCEAN_ACCESS_TOKEN`

**Vercel:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` (optional, can be in vercel.json)
- `VERCEL_PROJECT_ID` (optional, can be in vercel.json)

**Database (Dev):**
- `DEV_DB_HOST`
- `DEV_DB_PORT`
- `DEV_DB_USERNAME`
- `DEV_DB_PASSWORD`
- `DEV_DB_DATABASE`

**Database (Production):**
- `PROD_DB_HOST`
- `PROD_DB_PORT`
- `PROD_DB_USERNAME`
- `PROD_DB_PASSWORD`
- `PROD_DB_DATABASE`

### 3. Configure Vercel Integration

**Option A: Use Vercel GitHub Integration (Recommended)**
1. Go to Vercel dashboard
2. Import your GitHub repository
3. Set root directory to `client`
4. Vercel will auto-deploy on pushes to `dev` branch

**Option B: Use GitHub Actions (Current Setup)**
- The `frontend.yml` workflow will deploy using Vercel CLI
- Requires `VERCEL_TOKEN` secret

### 4. Configure DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create apps for:
   - Backend: Points to `registry.digitalocean.com/knowted-server/app:dev`
   - AI Agent: Points to `registry.digitalocean.com/knowted-aiagent/app:dev`
3. Set up auto-deploy on new image tags

## How It Works

### Path-Based Filtering

Workflows only run when relevant files change:

```yaml
paths:
  - 'server/**'      # Backend workflow
  - 'client/**'      # Frontend workflow
  - 'aiagent/**'     # AI Agent workflow
  - 'server/src/migrations/**'  # Migrations workflow
```

### Deployment Flow

1. **Push to `dev` branch**
   - CI runs tests for changed services
   - Backend changes → Build Docker image → Push to DigitalOcean
   - Frontend changes → Build → Deploy to Vercel
   - AI Agent changes → Build Docker image → Push to DigitalOcean
   - Migration changes → Auto-run migrations on dev database

2. **Push to `production` branch**
   - Same as dev, but:
   - Deploys to production environments
   - Migrations require manual approval

### Pre-commit Hooks

Before each commit:
- Detects which services have changed files
- Runs type checking for changed services
- Runs tests for changed services
- Blocks commit if checks fail

## Testing the Setup

### Test CI Workflow

```bash
# Make a small change to trigger CI
echo "# Test" >> server/README.md
git add server/README.md
git commit -m "test: trigger CI"
git push origin dev
```

### Test Pre-commit Hook

```bash
# Make a change that should fail
# (e.g., introduce a TypeScript error)
# Try to commit - it should be blocked
```

### Test Deployment

```bash
# Make a change to server code
# Push to dev branch
# Check GitHub Actions to see deployment
# Check DigitalOcean to see new image
```

## Troubleshooting

### Pre-commit hooks not running

```bash
# Reinstall husky
pnpm install
pnpm prepare

# Make sure .husky/pre-commit is executable
chmod +x .husky/pre-commit
```

### Workflows not triggering

- Check path filters match your file changes
- Verify branch names match (`dev`, `develop`, `production`)
- Check GitHub Actions tab for errors

### Vercel deployment failing

- Verify `VERCEL_TOKEN` secret is set
- Check Vercel project is linked
- Review Vercel CLI output in workflow logs

### DigitalOcean deployment failing

- Verify `DIGITALOCEAN_ACCESS_TOKEN` secret is set
- Check Docker image builds successfully
- Verify App Platform is configured to watch for new tags

## Next Steps

1. ✅ Commit and push the new CI/CD setup
2. ⚠️ Remove old `server/.github/workflows/deploy.yml`
3. ⚠️ Remove old `server/.husky/pre-commit`
4. ⚠️ Set up GitHub Secrets
5. ⚠️ Configure Vercel integration
6. ⚠️ Configure DigitalOcean App Platform
7. ⚠️ Test with a small change

