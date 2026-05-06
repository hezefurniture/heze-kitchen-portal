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

  const user = session.user as any;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "DESPATCHED") {
    return NextResponse.json({ error: "Already despatched" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "DESPATCHED",
      despatchedAt: new Date(),
      despatchedBy: user.name || user.username || user.id,
    },
  });

  return NextResponse.json({ success: true });
}
