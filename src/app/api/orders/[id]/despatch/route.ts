import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assignDespatchScan } from "@/lib/scan-logic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode } = await req.json();
  if (!barcode) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const result = await assignDespatchScan(barcode, params.id, userId);

  return NextResponse.json(result);
}
