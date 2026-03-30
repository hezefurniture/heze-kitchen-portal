import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const supplier = await prisma.supplier.findUnique({ where: { slug } });
    if (!supplier) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(supplier);
  }

  const suppliers = await prisma.supplier.findMany();
  return NextResponse.json(suppliers);
}
