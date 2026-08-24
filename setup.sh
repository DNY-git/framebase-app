#!/usr/bin/env bash
# First-run setup script for ConstructTrack.
# Copies .env.example to .env if .env does not exist,
# then installs dependencies.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

echo "=== ConstructTrack Setup ==="

# Create .env from template if missing
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "Creating .env from .env.example ..."
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "  -> .env created. Edit it with your MongoDB URI and secrets."
else
  echo ".env already exists — skipping."
fi

# Install dependencies
echo "Installing dependencies ..."
npm install

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit .env (set MONGODB_URI, JWT secrets, etc.)"
echo "  2. npm run dev"
