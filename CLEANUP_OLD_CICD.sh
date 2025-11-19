#!/bin/bash
# Script to clean up old CI/CD files

echo "🧹 Cleaning up old CI/CD files..."

# Remove old server workflow (replaced by root workflows)
if [ -f "server/.github/workflows/deploy.yml" ]; then
  echo "❌ Removing old server/.github/workflows/deploy.yml"
  rm server/.github/workflows/deploy.yml
fi

# Remove old server pre-commit hook (replaced by root hook)
if [ -f "server/.husky/pre-commit" ]; then
  echo "❌ Removing old server/.husky/pre-commit"
  rm server/.husky/pre-commit
fi

# Remove empty directories if they exist
if [ -d "server/.github/workflows" ] && [ -z "$(ls -A server/.github/workflows)" ]; then
  echo "❌ Removing empty server/.github/workflows directory"
  rmdir server/.github/workflows
fi

if [ -d "server/.github" ] && [ -z "$(ls -A server/.github)" ]; then
  echo "❌ Removing empty server/.github directory"
  rmdir server/.github
fi

if [ -d "server/.husky" ] && [ -z "$(ls -A server/.husky)" ]; then
  echo "❌ Removing empty server/.husky directory"
  rmdir server/.husky
fi

echo "✅ Cleanup complete!"
echo ""
echo "📝 Review changes with: git status"
echo "📝 Commit with: git add -A && git commit -m 'chore: remove old CI/CD files'"
