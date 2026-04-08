import { prisma } from "./db";

export interface ScannedItemDetail {
  itemId: string;
  itemName: string;
  barcode: string;
  newQty: number;
  totalQty: number;
}

export interface ScanResult {
  matched: boolean;
  orderNumber?: string;
  itemName?: string;
  newScannedQty?: number;
  totalQty?: number;
  orderId?: string;
  barcode?: string;
  scannedItems?: ScannedItemDetail[];
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

    // BRW Kitchens special-case: a single barcode represents one physical box
    // that contains multiple element types. Scanning it should increment all
    // open rows in the same order that share this barcode.
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    const isBrw = supplier?.slug === "brw";

    // Items in the same order with this barcode that still have open qty.
    const sameOrderOpenItems = isBrw
      ? items.filter((i) => i.orderId === item.orderId && i.scannedQty < i.quantity)
      : [item];

    // Increment scanned quantity for the targeted item(s)
    const updatedMap = new Map<string, number>();
    for (const target of sameOrderOpenItems) {
      const u = await tx.orderItem.update({
        where: { id: target.id },
        data: { scannedQty: { increment: 1 } },
      });
      updatedMap.set(target.id, u.scannedQty);

      await tx.scanLog.create({
        data: {
          orderItemId: target.id,
          scannedById: userId,
          scanType: "DELIVERY",
          barcode,
        },
      });
    }

    const updatedScannedQty = updatedMap.get(item.id) ?? item.scannedQty + 1;

    // Check if all items in this order are fully scanned
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
    });

    const allScanned = orderItems.every((oi) => {
      const qty = updatedMap.has(oi.id) ? updatedMap.get(oi.id)! : oi.scannedQty;
      return qty >= oi.quantity;
    });

    if (allScanned) {
      await tx.order.update({
        where: { id: item.orderId },
        data: { status: "IN_STOCK" },
      });
    }

    const scannedItems: ScannedItemDetail[] = sameOrderOpenItems.map((t) => ({
      itemId: t.id,
      itemName: t.itemName,
      barcode: t.barcode,
      newQty: updatedMap.get(t.id) ?? t.scannedQty + 1,
      totalQty: t.quantity,
    }));

    return {
      matched: true,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      newScannedQty: updatedScannedQty,
      totalQty: item.quantity,
      orderId: item.orderId,
      barcode: item.barcode,
      scannedItems,
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

    // BRW Kitchens special-case: one barcode = one box containing multiple
    // element types, so despatch-scanning it advances every open row in this
    // order that shares the barcode.
    const supplier = await tx.supplier.findUnique({
      where: { id: item.order.supplierId },
    });
    const isBrw = supplier?.slug === "brw";

    const targets = isBrw
      ? items.filter((i) => i.despatchedQty < i.quantity)
      : [item];

    const updatedMap = new Map<string, number>();
    for (const target of targets) {
      const u = await tx.orderItem.update({
        where: { id: target.id },
        data: { despatchedQty: { increment: 1 } },
      });
      updatedMap.set(target.id, u.despatchedQty);

      await tx.scanLog.create({
        data: {
          orderItemId: target.id,
          scannedById: userId,
          scanType: "DESPATCH",
          barcode,
        },
      });
    }

    const updatedDespatchedQty = updatedMap.get(item.id) ?? item.despatchedQty + 1;

    // Check if all items in this order are fully despatched
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
    });

    const allDespatched = orderItems.every((oi) => {
      const qty = updatedMap.has(oi.id) ? updatedMap.get(oi.id)! : oi.despatchedQty;
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

    const scannedItems: ScannedItemDetail[] = targets.map((t) => ({
      itemId: t.id,
      itemName: t.itemName,
      barcode: t.barcode,
      newQty: updatedMap.get(t.id) ?? t.despatchedQty + 1,
      totalQty: t.quantity,
    }));

    return {
      matched: true,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      newScannedQty: updatedDespatchedQty,
      totalQty: item.quantity,
      orderId: item.orderId,
      barcode: item.barcode,
      scannedItems,
    };
  });
}
