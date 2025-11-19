# DigitalOcean Container Registry Setup Guide

## Overview

This guide will help you set up DigitalOcean Container Registry for both staging and production deployments.

## Step 1: Create Container Registry in DigitalOcean

1. **Go to DigitalOcean Dashboard**
   - Navigate to: https://cloud.digitalocean.com/registry

2. **Create a new registry**
   - Click "Create Registry"
   - **Choose a name: `knowted`** (this is important - must match `REGISTRY_NAME` in workflows)
   - Select a region (choose closest to your App Platform apps)
   - Click "Create Registry"

3. **Note your registry URL**
   - Registry name: `knowted`
   - Full URL format: `registry.digitalocean.com/knowted/IMAGE_NAME:TAG`
   - Example images that will be created:
     - `registry.digitalocean.com/knowted/knowted:staging` (backend staging)
     - `registry.digitalocean.com/knowted/knowted:production` (backend production)
     - `registry.digitalocean.com/knowted/knowted-aiagent:staging` (AI agent staging)
     - `registry.digitalocean.com/knowted/knowted-aiagent:production` (AI agent production)

## Step 2: Generate Access Token

1. **Go to API Tokens**
   - Navigate to: https://cloud.digitalocean.com/account/api/tokens

2. **Create a new token**
   - Click "Generate New Token"
   - Name: `GitHub Actions CI/CD`
   - Scope: Select "Write" (or "Read and Write")
   - Click "Generate Token"
   - **⚠️ Copy the token immediately** (you won't see it again!)

3. **Add to GitHub Secrets**
   - Go to your GitHub repo: https://github.com/JeffreyLauDev/knowted-mono
   - Navigate to: `Settings → Secrets and variables → Actions`
   - Click "New repository secret"
   - Name: `DIGITALOCEAN_ACCESS_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

## Step 3: Configure Image Names

The workflows are configured to push images with these tags:

### Backend (Server)
- **Staging**: `registry.digitalocean.com/knowted/knowted:staging` (primary tag)
- **Production**: `registry.digitalocean.com/knowted/knowted:production` (primary tag)
- **Also tagged as**: `registry.digitalocean.com/knowted-server/app:dev` or `:production` (for tracking)

### AI Agent
- **Staging**: `registry.digitalocean.com/knowted/knowted-aiagent:staging` (primary tag)
- **Production**: `registry.digitalocean.com/knowted/knowted-aiagent:production` (primary tag)
- **Also tagged as**: `registry.digitalocean.com/knowted-aiagent/app:dev` or `:production` (for tracking)

## Step 4: Set Up DigitalOcean App Platform

### For Backend (Server)

1. **Go to App Platform**
   - Navigate to: https://cloud.digitalocean.com/apps

2. **Create a new app** (or edit existing)
   - Click "Create App"
   - Choose "Container Registry" as source
   - Select your registry: `knowted`
   - **For staging**: Select image: `knowted`, tag: `staging`
   - **For production**: Select image: `knowted`, tag: `production`
   - **Note**: The image name in the registry will be `knowted`, and tags are `staging` or `production`

3. **Configure auto-deploy**
   - Enable "Auto Deploy"
   - **For staging app**: Set to watch tag: `staging`
   - **For production app**: Set to watch tag: `production`
   - App Platform will automatically deploy when new images with these tags are pushed

4. **Repeat for Production**
   - Create a separate app for production
   - Use image: `knowted`, tag: `production`

### For AI Agent

1. **Create another app** (or edit existing)
   - Choose "Container Registry" as source
   - Select your registry: `knowted`
   - **For staging**: Select image: `knowted-aiagent`, tag: `staging`
   - **For production**: Select image: `knowted-aiagent`, tag: `production`

2. **Configure auto-deploy**
   - Enable "Auto Deploy"
   - **For staging app**: Set to watch tag: `staging`
   - **For production app**: Set to watch tag: `production`

## Step 5: Verify Setup

### Test the Connection

1. **Push a test change to `dev` branch**
   ```bash
   # Make a small change to server
   echo "# Test" >> server/README.md
   git add server/README.md
   git commit -m "test: verify CI/CD"
   git push origin dev
   ```

2. **Check GitHub Actions**
   - Go to: https://github.com/JeffreyLauDev/knowted-mono/actions
   - Watch the `Backend Deployment` workflow
   - Should build and push to DigitalOcean

3. **Check DigitalOcean Registry**
   - Go to: https://cloud.digitalocean.com/registry
   - Click on your registry
   - You should see new images being pushed

4. **Check App Platform**
   - Go to: https://cloud.digitalocean.com/apps
   - Your app should show "Deploying" or "Live"
   - Check logs to verify deployment

## Image Tagging Strategy

The workflows use multiple tags for flexibility:

### Primary Tags (for App Platform)
- `knowted:staging` - Points to latest staging build
- `knowted:production` - Points to latest production build

### Detailed Tags (for tracking)
- `knowted-server/app:dev` - Latest dev build
- `knowted-server/app:production` - Latest production build
- `knowted-server/app:dev-<sha>` - Specific commit SHA

### Why Multiple Tags?

- **Primary tags** (`knowted:staging`) - Simple, always points to latest
- **Detailed tags** (`knowted-server/app:dev`) - More descriptive, shows service
- **SHA tags** (`dev-<sha>`) - For rollback and debugging

## Troubleshooting

### Images not appearing in registry

1. Check GitHub Actions logs for errors
2. Verify `DIGITALOCEAN_ACCESS_TOKEN` secret is set correctly
3. Check registry name matches in workflows

### App Platform not deploying

1. Verify auto-deploy is enabled
2. Check that the tag name matches exactly
3. Verify App Platform has access to the registry
4. Check App Platform logs for errors

### Authentication errors

1. Regenerate DigitalOcean access token
2. Update GitHub secret with new token
3. Ensure token has "Write" permissions

## Next Steps

1. ✅ Set up DigitalOcean Container Registry
2. ✅ Add `DIGITALOCEAN_ACCESS_TOKEN` to GitHub Secrets
3. ✅ Create App Platform apps for staging and production
4. ✅ Test with a push to `dev` branch
5. ⚠️ Set up production app (when ready)

## Cost Considerations

- **Container Registry**: ~$5/month for 1GB storage
- **App Platform**: Pay per app (varies by resources)
- **Bandwidth**: Included in App Platform pricing

For staging, you can use smaller instance sizes to save costs.

