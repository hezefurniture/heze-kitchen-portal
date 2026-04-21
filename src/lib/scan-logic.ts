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

/**
 * Load the Extom ambiguous-barcode list from AppSettings.
 * Returns a Set of barcode strings.
 */
async function getExtomAmbiguousBarcodes(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<Set<string>> {
  const settings = await tx.appSettings.findUnique({
    where: { id: "singleton" },
    select: { extomAmbiguousBarcodes: true },
  });
  if (!settings?.extomAmbiguousBarcodes) return new Set();
  try {
    const arr = JSON.parse(settings.extomAmbiguousBarcodes);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function assignDeliveryScan(
  barcode: string,
  supplierId: string,
  userId: string,
  deliveryId?: string,
  preferredOrderId?: string,
  allowedStatuses: OrderStatus[] = ["PENDING"]
): Promise<ScanResult> {
  return prisma.$transaction(async (tx) => {
    // Find the first order item matching this barcode with open quantity
    const items = await tx.orderItem.findMany({
      where: {
        barcode,
        order: {
          supplierId,
          status: { in: allowedStatuses },
        },
        ...(deliveryId ? { deliveryId } : {}),
      },
      include: { order: true },
      orderBy: { order: { createdAt: "asc" } },
    });

    // Filter to items where scannedQty < quantity
    const openItems = items.filter((i) => i.scannedQty < i.quantity);

    // Prioritise the preferred order (the order the previous scan landed in)
    // so consecutive items from the same delivery stay grouped.
    let item = preferredOrderId
      ? openItems.find((i) => i.orderId === preferredOrderId) ?? openItems[0]
      : openItems[0];

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities fulfilled" };
    }

    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    const isBrw = supplier?.slug === "brw";
    const isExtom = supplier?.slug === "extom";
    const isAkrylik = supplier?.slug === "akrylik";

    // Extom disambiguation: if this barcode is in the ambiguous list, ALWAYS
    // ask the operator to pick which item was scanned — even if only one name
    // has open qty. This prevents the system from silently assigning scans to
    // the wrong item when the supplier ships the wrong box mix.
    if (isExtom) {
      const ambiguousSet = await getExtomAmbiguousBarcodes(tx);
      if (ambiguousSet.has(barcode)) {
        // Show ALL items in the earliest order with this barcode (open + complete)
        // so the operator can see the full picture.
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
            })),
          };
        }
      }
    }

    // BRW and Akrylik: one barcode = one physical box containing multiple element
    // types. Scanning it increments all open rows in the same order that share
    // this barcode, so every element gets marked in a single scan.
    const sameOrderOpenItems = (isBrw || isAkrylik)
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

    // Despatch is capped at what was actually booked in (scannedQty), not the
    // originally-ordered quantity. If 3 of 4 boxes were missing at booking, only
    // 1 can be despatched.
    const openItems = items.filter((i) => i.despatchedQty < i.scannedQty);
    const item = openItems[0];

    if (!item) {
      return { matched: false, error: "No matching item found or all quantities despatched" };
    }

    const supplier = await tx.supplier.findUnique({
      where: { id: item.order.supplierId },
    });
    const isBrw = supplier?.slug === "brw";
    const isExtom = supplier?.slug === "extom";

    // Extom disambiguation for despatch — always ask when barcode is ambiguous
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
            quantity: i.scannedQty,
          })),
        };
      }
    }

    // BRW Kitchens special-case
    const targets = isBrw
      ? items.filter((i) => i.despatchedQty < i.scannedQty)
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

    // Check if all items in this order are fully despatched (against scannedQty)
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
    });

    const allDespatched = orderItems.every((oi) => {
      const qty = updatedMap.has(oi.id) ? updatedMap.get(oi.id)! : oi.despatchedQty;
      return qty >= oi.scannedQty;
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
      totalQty: t.scannedQty,
    }));

    return {
      matched: true,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      newScannedQty: updatedDespatchedQty,
      totalQty: item.scannedQty,
      orderId: item.orderId,
      barcode: item.barcode,
      scannedItems,
    };
  });
}
