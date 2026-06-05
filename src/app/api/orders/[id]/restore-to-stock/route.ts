import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "DESPATCHED") {
    return NextResponse.json({ error: "Order is not in DESPATCHED status" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "IN_STOCK",
      despatchedAt: null,
      despatchedBy: null,
    },
  });

  // Reset despatchedQty on all items
  await prisma.orderItem.updateMany({
    where: { orderId: params.id },
    data: { despatchedQty: 0 },
  });

  return NextResponse.json({ success: true });
}
