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

  const { itemId, action, type, value } = await req.json();
  // action: "increment" | "decrement" | "set"
  // type: "delivery" | "despatch"
  // value: number (only for "set")

  if (!itemId || !action || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });

  if (!item || item.orderId !== params.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const field = type === "despatch" ? "despatchedQty" : "scannedQty";
  const currentVal = type === "despatch" ? item.despatchedQty : item.scannedQty;
  // Despatch is capped at what was booked in, not the original order quantity
  const maxVal = type === "despatch" ? item.scannedQty : item.quantity;

  if (action === "increment" && currentVal >= maxVal) {
    return NextResponse.json({ error: "Already at max quantity" }, { status: 400 });
  }
  if (action === "decrement" && currentVal <= 0) {
    return NextResponse.json({ error: "Already at zero" }, { status: 400 });
  }
  if (action === "set") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    }
    if (value < 0 || value > maxVal) {
      return NextResponse.json(
        { error: `Value must be between 0 and ${maxVal}` },
        { status: 400 }
      );
    }
  }

  let updateData: any;
  if (action === "increment") {
    updateData = { [field]: { increment: 1 } };
  } else if (action === "decrement") {
    updateData = { [field]: { decrement: 1 } };
  } else {
    updateData = { [field]: Math.floor(value) };
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: updateData,
  });

  // Log the manual scan
  const userId = (session.user as any).id;
  const newVal = type === "despatch" ? updated.despatchedQty : updated.scannedQty;
  if (action === "increment" || (action === "set" && newVal > currentVal)) {
    await prisma.scanLog.create({
      data: {
        orderItemId: itemId,
        scannedById: userId,
        scanType: type === "despatch" ? "DESPATCH" : "DELIVERY",
        barcode: `MANUAL:${item.barcode}`,
      },
    });
  }

  // Check if order status needs updating
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: params.id },
  });

  if (type === "delivery") {
    const allScanned = orderItems.every((oi) => {
      const qty = oi.id === itemId ? (type === "delivery" ? (action === "increment" ? updated.scannedQty : updated.scannedQty) : oi.scannedQty) : oi.scannedQty;
      return qty >= oi.quantity;
    });
    // Re-check with actual updated values
    const allDone = orderItems.every((oi) => {
      const val = oi.id === itemId ? updated.scannedQty : oi.scannedQty;
      return val >= oi.quantity;
    });
    if (allDone) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      await prisma.order.update({
        where: { id: params.id },
        data: {
          status: "IN_STOCK",
          movedToStockAt: new Date(),
          movedToStockBy: user?.name || user?.username || userId,
        },
      });
    } else {
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "PENDING", movedToStockAt: null, movedToStockBy: null },
      });
    }
  }

  if (type === "despatch") {
    const allDespatched = orderItems.every((oi) => {
      const val = oi.id === itemId ? updated.despatchedQty : oi.despatchedQty;
      return val >= oi.scannedQty;
    });
    if (allDespatched) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "DESPATCHED", despatchedAt: new Date(), despatchedBy: user?.name || userId },
      });
    } else if (item.order.status === "DESPATCHED") {
      // Was despatched, now undoing - move back
      await prisma.order.update({
        where: { id: params.id },
        data: { status: "IN_STOCK", despatchedAt: null, despatchedBy: null },
      });
    }
  }

  return NextResponse.json({ success: true, [field]: updated[field] });
}
