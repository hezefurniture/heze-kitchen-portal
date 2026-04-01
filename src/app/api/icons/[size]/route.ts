import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves PWA app icons from the database.
 * GET /api/icons/192 or /api/icons/512
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = params.size;

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { appIcon192: true, appIcon512: true },
  });

  const base64Data = size === "512" ? settings?.appIcon512 : settings?.appIcon192;

  if (!base64Data) {
    return new Response(null, { status: 404 });
  }

  // base64Data is a data URL like "data:image/png;base64,..."
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid icon data" }, { status: 500 });
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
