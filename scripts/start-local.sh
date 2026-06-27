#!/usr/bin/env bash
#
# Start Ayla locally: bring up Postgres + Redis, wait until they're ready,
# apply migrations, then run the bot in watch mode. Stop everything with Ctrl+C
# (the datastores keep running; use `npm run stop` to shut them down).
set -euo pipefail

# Always run from the project root, regardless of where this is invoked.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

if [ ! -f .env ]; then
  echo "❌ No .env found. Run: cp .env.example .env  and fill in the tokens."
  exit 1
fi

echo "🐘  Starting Postgres + Redis..."
docker compose up -d

printf "⏳  Waiting for Postgres"
until docker compose exec -T postgres pg_isready -U ayla -d ayla >/dev/null 2>&1; do
  printf "."
  sleep 1
done
echo " ready."

echo "🗃️   Applying database migrations..."
npx prisma generate >/dev/null
npx prisma migrate deploy

echo "🤖  Starting Ayla (Ctrl+C to stop)..."
npm run start:dev
