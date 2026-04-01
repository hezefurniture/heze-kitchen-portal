import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { appIcon192: true },
  });

  const base64Data = settings?.appIcon192;
  if (!base64Data) {
    return new Response(null, { status: 404 });
  }

  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid icon data" }, { status: 500 });
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
