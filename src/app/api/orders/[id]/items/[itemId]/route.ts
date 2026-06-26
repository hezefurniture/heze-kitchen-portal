import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: params.itemId, orderId: params.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { itemName, barcode, quantity } = await req.json();
  const data: any = {};
  if (itemName !== undefined) data.itemName = itemName.trim();
  if (barcode !== undefined) data.barcode = barcode.trim();
  if (quantity !== undefined) data.quantity = parseInt(quantity, 10) || 1;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.orderItem.update({
    where: { id: params.itemId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: params.itemId, orderId: params.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.scanLog.deleteMany({ where: { orderItemId: params.itemId } });
  await prisma.orderItem.delete({ where: { id: params.itemId } });

  return NextResponse.json({ success: true });
}
