import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncAkrylikPackages } from "@/lib/akrylik";

async function getStatus() {
  const packages = await prisma.akrylikPackage.findMany({
    where: { syncedAt: null },
    select: { code: true, orderId: true, lastError: true, attempts: true },
  });
  const lines = packages.length
    ? await prisma.orderItem.findMany({
        where: { barcode: { in: packages.map((p) => p.code) }, orderId: { in: packages.map((p) => p.orderId) } },
        select: { barcode: true, orderId: true, quantity: true, scannedQty: true },
      })
    : [];

  const failing: { code: string; error: string | null; attempts: number }[] = [];
  for (const p of packages) {
    const pkgLines = lines.filter((l) => l.barcode === p.code && l.orderId === p.orderId);
    const received = pkgLines.length > 0 && pkgLines.every((l) => l.scannedQty >= l.quantity);
    if (received) failing.push({ code: p.code, error: p.lastError, attempts: p.attempts });
  }
  return { unsynced: failing.length, packages: failing };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getStatus());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await syncAkrylikPackages(
    typeof body.deliveryId === "string" ? { deliveryId: body.deliveryId } : {}
  );
  return NextResponse.json({ ...result, ...(await getStatus()) });
}
