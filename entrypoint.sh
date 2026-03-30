#!/bin/sh

echo "Waiting for database to be ready..."
MAX_RETRIES=15
RETRY=0
until npx prisma migrate deploy 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "Database migration failed after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Migration attempt $RETRY failed, retrying in 3s..."
  sleep 3
done
echo "Migrations applied successfully."

echo "Seeding database..."
npx prisma db seed 2>/dev/null || echo "Seed skipped (may already exist or tsx not available)"

echo "Starting server on port ${PORT:-3000}..."
exec node server.js
