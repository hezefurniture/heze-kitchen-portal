import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const status = searchParams.get("status");

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({ where: { slug } });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const statusFilter = status
    ? { in: status.split(",") as any[] }
    : undefined;

  const orders = await prisma.order.findMany({
    where: {
      supplierId: supplier.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    movedToStockAt: o.movedToStockAt,
    movedToStockBy: o.movedToStockBy,
    despatchedAt: o.despatchedAt,
    despatchedBy: o.despatchedBy,
    totalQty: o.items.reduce((s, i) => s + i.quantity, 0),
    scannedQty: o.items.reduce((s, i) => s + i.scannedQty, 0),
    despatchedQty: o.items.reduce((s, i) => s + i.despatchedQty, 0),
  }));

  return NextResponse.json({ orders: result });
}
