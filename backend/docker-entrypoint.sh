#!/bin/sh
set -e

# For this demo we sync the schema directly with `db push`. A production
# deployment would instead apply versioned migrations: `prisma migrate deploy`.
echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "Seeding demo data (idempotent)..."
node dist/seed.js || echo "Seed skipped/failed (continuing)."

echo "Starting API..."
exec node dist/index.js
