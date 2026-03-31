#!/bin/sh

PRISMA="./node_modules/.bin/prisma"

echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'NO')"
echo "Waiting for database to be ready..."

MAX_RETRIES=15
RETRY=0
while true; do
  OUTPUT=$($PRISMA migrate deploy 2>&1) && break
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
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function seed() {
  const suppliers = [
    { name: "BRW Kitchens", slug: "brw" },
    { name: "Extom Kitchens", slug: "extom" },
    { name: "Akrylik Kitchens", slug: "akrylik" },
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { slug: s.slug }, create: s, update: s });
  }
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username: "admin",
        name: "Administrator",
        password: "$2b$10$xCNugmLdheNFWv.DsdHz4uH4hjYhpu1koFlncpaMab96ETEWFVgr.",
        role: "ADMIN"
      }
    });
    console.log("Created admin user (admin / admin123)");
  } else {
    console.log("Admin user already exists");
  }
  console.log("Seed complete");
}
seed().catch(e => console.error("Seed error:", e)).finally(() => prisma.$disconnect());
' 2>&1 || echo "Seed skipped"

echo "Starting server..."
exec ./node_modules/.bin/next start -p ${PORT:-3000} -H ${HOSTNAME:-0.0.0.0}
