#!/bin/sh

echo "DATABASE_URL is: ${DATABASE_URL:-(not set)}"
echo "Waiting for database to be ready..."

MAX_RETRIES=15
RETRY=0
while true; do
  OUTPUT=$(npx prisma migrate deploy 2>&1) && break
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "Database migration failed after $MAX_RETRIES attempts. Last error:"
    echo "$OUTPUT"
    exit 1
  fi
  echo "Migration attempt $RETRY failed: $OUTPUT"
  echo "Retrying in 3s..."
  sleep 3
done
echo "Migrations applied successfully."

echo "Seeding database..."
npx prisma db seed 2>&1 || echo "Seed skipped (may already exist or tsx not available)"

echo "Starting server on port ${PORT:-3000}..."
exec node server.js
