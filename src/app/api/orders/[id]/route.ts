import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { id: "asc" } },
      supplier: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderNumber, isAddition, hezeOrderNumber, customerName, postcode, plinthQty, plinthColour, sealQty, bracketQty, weight, notes } = body;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: any = {};

  if (orderNumber !== undefined) {
    if (!orderNumber || !orderNumber.trim()) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }
    const duplicate = await prisma.order.findFirst({
      where: {
        supplierId: order.supplierId,
        orderNumber: orderNumber.trim(),
        id: { not: params.id },
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Order number already exists for this supplier" }, { status: 400 });
    }
    data.orderNumber = orderNumber.trim();
  }

  if (typeof isAddition === "boolean") {
    data.isAddition = isAddition;
  }

  if (hezeOrderNumber !== undefined) data.hezeOrderNumber = hezeOrderNumber || null;
  if (customerName !== undefined) data.customerName = customerName || null;
  if (postcode !== undefined) data.postcode = postcode || null;
  if (plinthQty !== undefined) data.plinthQty = plinthQty !== null && plinthQty !== "" ? parseInt(plinthQty, 10) || null : null;
  if (plinthColour !== undefined) data.plinthColour = plinthColour || null;
  if (sealQty !== undefined) data.sealQty = sealQty !== null && sealQty !== "" ? parseInt(sealQty, 10) || null : null;
  if (bracketQty !== undefined) data.bracketQty = bracketQty !== null && bracketQty !== "" ? parseInt(bracketQty, 10) || null : null;
  if (weight !== undefined) data.weight = weight || null;
  if (notes !== undefined) data.notes = notes || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { scanLogs: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete in order: scan logs -> order items -> order
  for (const item of order.items) {
    await prisma.scanLog.deleteMany({ where: { orderItemId: item.id } });
  }
  await prisma.orderItem.deleteMany({ where: { orderId: params.id } });
  await prisma.order.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
