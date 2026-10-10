#!/bin/bash
# Copy the code (allow-list only: no data, results, model binaries or credentials) into the team repo's model/ folder.
# usage: bash scripts/sync_to_nutrix.sh <Nutrix clone>
set -e
DST="$1/model"
mkdir -p "$DST"
rsync -a --delete --prune-empty-dirs \
  --exclude '__pycache__/' --exclude '*.pyc' \
  --include 'pmrf/***' --include 'service/***' --include 'scripts/***' --include 'tests/***' \
  --include 'docs/' --include 'docs/api_contract.md' \
  --include 'deploy/' --include 'deploy/Dockerfile' --include 'deploy/requirements.txt' \
  --include 'site/' --include 'site/template.html' \
  --include 'README.md' --include 'DEPLOY.md' --include '.dockerignore' --include 'requirements-dev.txt' \
  --exclude '*' ./ "$DST/"
cp deploy/gitignore.model "$DST/.gitignore"
echo "synced to $DST"
