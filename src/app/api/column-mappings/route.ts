import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/column-mappings?supplierId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supplierId = req.nextUrl.searchParams.get("supplierId");
  if (!supplierId) {
    return NextResponse.json({ error: "supplierId required" }, { status: 400 });
  }

  const mappings = await prisma.columnMapping.findMany({
    where: { supplierId },
  });

  return NextResponse.json(mappings);
}

// PUT /api/column-mappings - upsert all mappings for a supplier
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { supplierId, mappings } = await req.json();

  if (!supplierId || !Array.isArray(mappings)) {
    return NextResponse.json({ error: "supplierId and mappings required" }, { status: 400 });
  }

  const validTargets = ["orderNumber", "itemName", "barcode", "quantity"];

  // Upsert each mapping
  const results = [];
  for (const m of mappings) {
    if (!validTargets.includes(m.targetField)) continue;
    if (!m.sourceColumns || !Array.isArray(m.sourceColumns) || m.sourceColumns.length === 0) {
      // Delete mapping if no source columns
      await prisma.columnMapping.deleteMany({
        where: { supplierId, targetField: m.targetField },
      });
      continue;
    }

    const result = await prisma.columnMapping.upsert({
      where: {
        supplierId_targetField: { supplierId, targetField: m.targetField },
      },
      create: {
        supplierId,
        targetField: m.targetField,
        sourceColumns: JSON.stringify(m.sourceColumns),
        mergeStrategy: m.mergeStrategy || "first",
        separator: m.separator ?? " ",
        template: m.template || "",
        prefix: m.prefix || "",
        suffix: m.suffix || "",
      },
      update: {
        sourceColumns: JSON.stringify(m.sourceColumns),
        mergeStrategy: m.mergeStrategy || "first",
        separator: m.separator ?? " ",
        template: m.template || "",
        prefix: m.prefix || "",
        suffix: m.suffix || "",
      },
    });
    results.push(result);
  }

  return NextResponse.json(results);
}
