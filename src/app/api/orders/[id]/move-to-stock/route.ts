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

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Order is not in PENDING status" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "IN_STOCK",
      movedToStockAt: new Date(),
      movedToStockBy: user?.name || user?.username || userId,
    },
  });

  return NextResponse.json({ success: true });
}
