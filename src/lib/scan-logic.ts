import { prisma } from "./db";

export interface ScanResult {
  matched: boolean;
  orderNumber?: string;
  itemName?: string;
  newScannedQty?: number;
  totalQty?: number;
  orderId?: string;
  error?: string;
}

export async function assignDeliveryScan(
  barcode: string,
  supplierId: string,
  userId: string,
  deliveryId?: string
): Promise<ScanResult> {
  return prisma.$transaction(async (tx) => {
    // Find the first order item matching this barcode with open quantity
    const items = await tx.orderItem.findMany({
      where: {
        barcode,
        order: {
          supplierId,
          status: { in: ["PENDING"] },
        },
        ...(deliveryId ? { deliveryId } : {}),
      },
      include: { order: true },
      orderBy: { order: { createdAt: "asc" } },
    });

    // Filter to items where scannedQty < quantity
    const item = items.find((i) => i.scannedQty < i.quantity);

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities fulfilled" };
    }

    // Increment scanned quantity
    const updated = await tx.orderItem.update({
      where: { id: item.id },
      data: { scannedQty: { increment: 1 } },
    });

    // Create scan log
    await tx.scanLog.create({
      data: {
        orderItemId: item.id,
        scannedById: userId,
        scanType: "DELIVERY",
        barcode,
      },
    });

    // Check if all items in this order are fully scanned
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
    });

    const allScanned = orderItems.every((oi) => {
      const qty = oi.id === item.id ? updated.scannedQty : oi.scannedQty;
      return qty >= oi.quantity;
    });

    if (allScanned) {
      await tx.order.update({
        where: { id: item.orderId },
        data: { status: "IN_STOCK" },
      });
    }

    return {
      matched: true,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      newScannedQty: updated.scannedQty,
      totalQty: item.quantity,
      orderId: item.orderId,
    };
  });
}

export async function assignDespatchScan(
  barcode: string,
  orderId: string,
  userId: string
): Promise<ScanResult> {
  return prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({
      where: {
        orderId,
        barcode,
      },
      include: { order: true },
    });

    const item = items.find((i) => i.despatchedQty < i.quantity);

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities despatched" };
    }

    const updated = await tx.orderItem.update({
      where: { id: item.id },
      data: { despatchedQty: { increment: 1 } },
    });

    await tx.scanLog.create({
      data: {
        orderItemId: item.id,
        scannedById: userId,
        scanType: "DESPATCH",
        barcode,
      },
    });

    // Check if all items in this order are fully despatched
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
    });

    const allDespatched = orderItems.every((oi) => {
      const qty = oi.id === item.id ? updated.despatchedQty : oi.despatchedQty;
      return qty >= oi.quantity;
    });

    if (allDespatched) {
      const user = await tx.user.findUnique({ where: { id: userId } });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "DESPATCHED",
          despatchedAt: new Date(),
          despatchedBy: user?.name || user?.username || userId,
        },
      });
    }

    return {
      matched: true,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      newScannedQty: updated.despatchedQty,
      totalQty: item.quantity,
      orderId: item.orderId,
    };
  });
}
