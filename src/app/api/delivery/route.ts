import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseReceiptUrl } from "@/lib/akrylik";

interface AkrylikPackageInput {
  code: string;
  orderNumber: string;
  omRef: string;
  label: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, rows, orderMeta, akrylik } = await req.json();

  if (!slug || !rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({ where: { slug } });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;

  let akrylikReceiptUrl: string | null = null;
  let akrylikPackages: AkrylikPackageInput[] = [];
  if (akrylik) {
    const link = supplier.slug === "akrylik" && typeof akrylik.receiptUrl === "string"
      ? parseReceiptUrl(akrylik.receiptUrl)
      : null;
    if (!link || !Array.isArray(akrylik.packages) || akrylik.packages.length === 0) {
      return NextResponse.json({ error: "Invalid Akrylik import data" }, { status: 400 });
    }
    akrylikReceiptUrl = link.url;
    akrylikPackages = akrylik.packages.map((p: any) => ({
      code: String(p.code).trim().toUpperCase(),
      orderNumber: String(p.orderNumber).trim(),
      omRef: String(p.omRef || ""),
      label: String(p.label || ""),
    }));
    const duplicates = await prisma.akrylikPackage.findMany({
      where: { code: { in: akrylikPackages.map((p) => p.code) } },
      select: { code: true },
    });
    if (duplicates.length) {
      return NextResponse.json(
        { error: `Already imported: ${duplicates.map((d) => d.code).join(", ")}` },
        { status: 409 }
      );
    }
  }

  // Create delivery record
  const delivery = await prisma.delivery.create({
    data: {
      supplierId: supplier.id,
      uploadedById: userId,
      ...(akrylikReceiptUrl ? { akrylikReceiptUrl } : {}),
    },
  });
  const orderIdByNumber = new Map<string, string>();

  // Group rows by order number.
  // For BRW and Extom, multiple element types can share the same barcode
  // (one physical box = several rows, or multi-box cabinets with same barcode).
  // We keep them as distinct rows so each is visible, instead of merging by barcode.
  const keepDistinctTitles = supplier.slug === "brw" || supplier.slug === "extom" || supplier.slug === "akrylik";
  const orderMap = new Map<string, { itemName: string; barcode: string; quantity: number; parentBarcode?: string; parentName?: string }[]>();
  for (const row of rows) {
    const items = orderMap.get(row.orderNumber) || [];
    const existing = keepDistinctTitles
      ? items.find((i) => i.barcode === row.barcode && i.itemName === row.itemName)
      : items.find((i) => i.barcode === row.barcode);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      items.push({
        itemName: row.itemName,
        barcode: row.barcode,
        quantity: row.quantity,
        ...(row.parentBarcode ? { parentBarcode: row.parentBarcode } : {}),
        ...(row.parentName ? { parentName: row.parentName } : {}),
      });
    }
    orderMap.set(row.orderNumber, items);
  }

  const metaMap: Record<string, any> = {};
  if (orderMeta && typeof orderMeta === "object") {
    for (const [on, meta] of Object.entries(orderMeta)) {
      metaMap[on] = meta;
    }
  }

  // Create orders and items
  for (const [orderNumber, items] of orderMap) {
    const meta = metaMap[orderNumber] || {};
    const metaData: any = {};
    if (meta.hezeOrderNumber) metaData.hezeOrderNumber = meta.hezeOrderNumber;
    if (meta.customerName) metaData.customerName = meta.customerName;
    if (meta.postcode) metaData.postcode = meta.postcode;
    if (meta.plinthQty !== undefined && meta.plinthQty !== null && meta.plinthQty !== "") {
      metaData.plinthQty = parseInt(meta.plinthQty, 10) || null;
    }
    if (meta.plinthColour) metaData.plinthColour = meta.plinthColour;
    if (meta.sealQty !== undefined && meta.sealQty !== null && meta.sealQty !== "") {
      metaData.sealQty = parseInt(meta.sealQty, 10) || null;
    }
    if (meta.bracketQty !== undefined && meta.bracketQty !== null && meta.bracketQty !== "") {
      metaData.bracketQty = parseInt(meta.bracketQty, 10) || null;
    }
    if (meta.weight) metaData.weight = meta.weight;
    if (meta.notes) metaData.notes = meta.notes;

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
        ...metaData,
      },
      update: metaData,
    });
    orderIdByNumber.set(orderNumber, order.id);

    // New Akrylik packages for an order already booked in reopen it for receiving.
    if (akrylikReceiptUrl && order.status === "IN_STOCK") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PENDING", movedToStockAt: null, movedToStockBy: null },
      });
    }

    // Create order items
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          deliveryId: delivery.id,
          itemName: item.itemName,
          barcode: item.barcode,
          quantity: item.quantity,
          ...(item.parentBarcode ? { parentBarcode: item.parentBarcode } : {}),
          ...(item.parentName ? { parentName: item.parentName } : {}),
        },
      });
    }
  }

  if (akrylikReceiptUrl) {
    await prisma.akrylikPackage.createMany({
      data: akrylikPackages
        .filter((p) => orderIdByNumber.has(p.orderNumber))
        .map((p) => ({
          code: p.code,
          orderId: orderIdByNumber.get(p.orderNumber)!,
          deliveryId: delivery.id,
          omRef: p.omRef,
          label: p.label,
          receiptUrl: akrylikReceiptUrl!,
        })),
    });
  }

  return NextResponse.json({ deliveryId: delivery.id });
}
