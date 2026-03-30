import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create suppliers
  const suppliers = [
    { name: "BRW Kitchens", slug: "brw" },
    { name: "Extom Kitchens", slug: "extom" },
    { name: "Akrylik Kitchens", slug: "akrylik" },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { slug: s.slug },
      create: s,
      update: s,
    });
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      name: "Administrator",
      password: hashedPassword,
      role: "ADMIN",
    },
    update: {},
  });

  console.log("Seed complete: 3 suppliers + admin user created");
  console.log("Default login: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
