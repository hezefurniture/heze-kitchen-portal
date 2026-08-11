import { OrderStatus } from "@prisma/client";
import { prisma } from "./db";

export interface ScannedItemDetail {
  itemId: string;
  itemName: string;
  barcode: string;
  newQty: number;
  totalQty: number;
}

export interface AmbiguousCandidate {
  itemId: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  scannedQty: number;
  quantity: number;
  parentName?: string;
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
  ambiguous?: boolean;
  candidates?: AmbiguousCandidate[];
  error?: string;
}

// In-memory cache for Extom ambiguous barcodes — avoids a DB hit on every scan.
// TTL of 60 s; invalidated on server restart (acceptable for a rarely-changed list).
let _ambiguousCache: { barcodes: Set<string>; ts: number } | null = null;

async function getExtomAmbiguousBarcodes(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<Set<string>> {
  const now = Date.now();
  if (_ambiguousCache && now - _ambiguousCache.ts < 60_000) return _ambiguousCache.barcodes;
  const settings = await tx.appSettings.findUnique({
    where: { id: "singleton" },
    select: { extomAmbiguousBarcodes: true },
  });
  let barcodes = new Set<string>();
  if (settings?.extomAmbiguousBarcodes) {
    try {
      const arr = JSON.parse(settings.extomAmbiguousBarcodes);
      barcodes = new Set(Array.isArray(arr) ? arr : []);
    } catch { /* invalid JSON */ }
  }
  _ambiguousCache = { barcodes, ts: now };
  return barcodes;
}

export async function assignDeliveryScan(
  barcode: string,
  supplierId: string,
  userId: string,
  deliveryId?: string,
  preferredOrderId?: string,
  allowedStatuses: OrderStatus[] = ["PENDING"],
  excludeOrderIds?: string[]
): Promise<ScanResult> {
  return prisma.$transaction(async (tx) => {
    // One query: fetch matching items + their order + supplier + all sibling items.
    // Eliminates the separate tx.supplier.findUnique and second tx.orderItem.findMany calls.
    const items = await tx.orderItem.findMany({
      where: {
        barcode,
        order: {
          supplierId,
          status: { in: allowedStatuses },
          ...(excludeOrderIds?.length ? { id: { notIn: excludeOrderIds } } : {}),
        },
        ...(deliveryId ? { deliveryId } : {}),
      },
      include: { order: { include: { supplier: true, items: true } } },
      orderBy: { order: { createdAt: "asc" } },
    });

    const openItems = items.filter((i) => i.scannedQty < i.quantity);

    let item = preferredOrderId
      ? openItems.find((i) => i.orderId === preferredOrderId) ?? openItems[0]
      : openItems[0];

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities fulfilled" };
    }

    const supplier = item.order.supplier;
    const isBrw = supplier.slug === "brw";
    const isExtom = supplier.slug === "extom";
    const isAkrylik = supplier.slug === "akrylik";

    if (isExtom) {
      const ambiguousSet = await getExtomAmbiguousBarcodes(tx);
      if (ambiguousSet.has(barcode)) {
        const sameOrderAll = items.filter((i) => i.orderId === item.orderId);
        if (sameOrderAll.length > 1) {
          return {
            matched: false,
            ambiguous: true,
            barcode,
            candidates: sameOrderAll.map((i) => ({
              itemId: i.id,
              orderId: i.orderId,
              orderNumber: i.order.orderNumber,
              itemName: i.itemName,
              scannedQty: i.scannedQty,
              quantity: i.quantity,
              ...(i.parentName ? { parentName: i.parentName } : {}),
            })),
          };
        }
      }
    }

    const sameOrderOpenItems = (isBrw || isAkrylik)
      ? items.filter((i) => i.orderId === item.orderId && i.scannedQty < i.quantity)
      : [item];

    // Compute new quantities in memory — no need to read back return values from DB.
    const updatedMap = new Map<string, number>();
    for (const target of sameOrderOpenItems) {
      updatedMap.set(target.id, isAkrylik ? target.quantity : target.scannedQty + 1);
    }

    if (isAkrylik) {
      // Each item gets its own target quantity — individual updates required.
      for (const target of sameOrderOpenItems) {
        await tx.orderItem.update({
          where: { id: target.id },
          data: { scannedQty: target.quantity },
        });
      }
    } else {
      // All items get the same +1 — collapse N updates into one query.
      await tx.orderItem.updateMany({
        where: { id: { in: sameOrderOpenItems.map((t) => t.id) } },
        data: { scannedQty: { increment: 1 } },
      });
    }

    // Collapse N scan-log inserts into one query.
    await tx.scanLog.createMany({
      data: sameOrderOpenItems.map((target) => ({
        orderItemId: target.id,
        scannedById: userId,
        scanType: "DELIVERY" as const,
        barcode,
      })),
    });

    const updatedScannedQty = updatedMap.get(item.id) ?? item.scannedQty + 1;

    // Use the already-loaded sibling items — no second findMany.
    const allOrderItems = item.order.items;
    const allScanned = allOrderItems.every((oi) => {
      const qty = updatedMap.has(oi.id) ? updatedMap.get(oi.id)! : oi.scannedQty;
      return qty >= oi.quantity;
    });

    if (allScanned) {
      const scanUser = await tx.user.findUnique({ where: { id: userId } });
      await tx.order.update({
        where: { id: item.orderId },
        data: {
          status: "IN_STOCK",
          movedToStockAt: new Date(),
          movedToStockBy: scanUser?.name || scanUser?.username || userId,
        },
      });
    }

    const scannedItems: ScannedItemDetail[] = sameOrderOpenItems.map((t) => ({
      itemId: t.id,
      itemName: t.itemName,
      barcode: t.barcode,
      newQty: updatedMap.get(t.id) ?? (isAkrylik ? t.quantity : t.scannedQty + 1),
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
    // One query: items + order + supplier + all sibling items.
    const items = await tx.orderItem.findMany({
      where: { orderId, barcode },
      include: { order: { include: { supplier: true, items: true } } },
    });

    const openItems = items.filter((i) => i.despatchedQty < i.quantity);
    const item = openItems[0];

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities despatched" };
    }

    const supplier = item.order.supplier;
    const isBrw = supplier.slug === "brw";
    const isExtom = supplier.slug === "extom";

    if (isExtom) {
      const ambiguousSet = await getExtomAmbiguousBarcodes(tx);
      if (ambiguousSet.has(barcode) && items.length > 1) {
        return {
          matched: false,
          ambiguous: true,
          barcode,
          candidates: items.map((i) => ({
            itemId: i.id,
            orderId: i.orderId,
            orderNumber: i.order.orderNumber,
            itemName: i.itemName,
            scannedQty: i.despatchedQty,
            quantity: i.quantity,
            ...(i.parentName ? { parentName: i.parentName } : {}),
          })),
        };
      }
    }

    const targets = isBrw
      ? items.filter((i) => i.despatchedQty < i.quantity)
      : [item];

    // Compute new quantities in memory.
    const updatedMap = new Map<string, number>();
    for (const target of targets) {
      updatedMap.set(target.id, target.despatchedQty + 1);
    }

    // Collapse N updates into one query.
    await tx.orderItem.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { despatchedQty: { increment: 1 } },
    });

    // Collapse N scan-log inserts into one query.
    await tx.scanLog.createMany({
      data: targets.map((target) => ({
        orderItemId: target.id,
        scannedById: userId,
        scanType: "DESPATCH" as const,
        barcode,
      })),
    });

    const updatedDespatchedQty = updatedMap.get(item.id) ?? item.despatchedQty + 1;

    // Use already-loaded sibling items — no second findMany.
    const allOrderItems = item.order.items;
    const allDespatched = allOrderItems.every((oi) => {
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
