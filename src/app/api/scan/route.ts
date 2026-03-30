import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assignDeliveryScan } from "@/lib/scan-logic";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode, supplierId, deliveryId } = await req.json();

  if (!barcode || !supplierId) {
    return NextResponse.json({ error: "Missing barcode or supplierId" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const result = await assignDeliveryScan(barcode, supplierId, userId, deliveryId);

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const deliveryId = searchParams.get("deliveryId");

  if (!supplierId) {
    return NextResponse.json({ error: "Missing supplierId" }, { status: 400 });
  }

  const where: any = {
    order: { supplierId },
  };
  if (deliveryId) {
    where.deliveryId = deliveryId;
  }

  // Get orders with their items for this supplier/delivery
  const ordersWhere: any = { supplierId, status: "PENDING" };

  const orders = await prisma.order.findMany({
    where: ordersWhere,
    include: {
      items: deliveryId ? { where: { deliveryId } } : true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Filter to orders that actually have items from this delivery
  const filtered = orders.filter((o) => o.items.length > 0);

  return NextResponse.json({ orders: filtered });
}
