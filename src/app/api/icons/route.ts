import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves PWA app icons from the database.
 * GET /api/icons?size=192 or ?size=512
 * Returns the icon image or a 1x1 transparent PNG fallback.
 */
export async function GET(req: NextRequest) {
  const size = req.nextUrl.searchParams.get("size");

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { appIcon192: true, appIcon512: true },
  });

  const base64Data = size === "512" ? settings?.appIcon512 : settings?.appIcon192;

  if (!base64Data) {
    // Return a 1x1 transparent PNG as fallback
    const fallback = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    return new Response(fallback, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
