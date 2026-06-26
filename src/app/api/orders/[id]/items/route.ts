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
    include: { items: { take: 1 } },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { itemName, barcode, quantity } = await req.json();
  if (!itemName || !barcode || !quantity) {
    return NextResponse.json({ error: "Item name, barcode, and quantity are required" }, { status: 400 });
  }

  const existingItem = order.items[0];
  let deliveryId: string;
  if (existingItem) {
    deliveryId = existingItem.deliveryId;
  } else {
    const delivery = await prisma.delivery.create({
      data: {
        supplierId: order.supplierId,
        uploadedById: (session.user as any).id,
      },
    });
    deliveryId = delivery.id;
  }

  const item = await prisma.orderItem.create({
    data: {
      orderId: params.id,
      deliveryId,
      itemName: itemName.trim(),
      barcode: barcode.trim(),
      quantity: parseInt(quantity, 10) || 1,
    },
  });

  return NextResponse.json(item);
}
