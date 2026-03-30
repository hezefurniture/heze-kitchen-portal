import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, rows } = await req.json();

  if (!slug || !rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({ where: { slug } });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;

  // Create delivery record
  const delivery = await prisma.delivery.create({
    data: {
      supplierId: supplier.id,
      uploadedById: userId,
    },
  });

  // Group rows by order number
  const orderMap = new Map<string, { itemName: string; barcode: string; quantity: number }[]>();
  for (const row of rows) {
    const items = orderMap.get(row.orderNumber) || [];
    const existing = items.find((i) => i.barcode === row.barcode);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      items.push({ itemName: row.itemName, barcode: row.barcode, quantity: row.quantity });
    }
    orderMap.set(row.orderNumber, items);
  }

  // Create orders and items
  for (const [orderNumber, items] of orderMap) {
    // Upsert order
    const order = await prisma.order.upsert({
      where: {
        supplierId_orderNumber: {
          supplierId: supplier.id,
          orderNumber,
        },
      },
      create: {
        supplierId: supplier.id,
        orderNumber,
        status: "PENDING",
      },
      update: {},
    });

    // Create order items
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          deliveryId: delivery.id,
          itemName: item.itemName,
          barcode: item.barcode,
          quantity: item.quantity,
        },
      });
    }
  }

  return NextResponse.json({ deliveryId: delivery.id });
}
