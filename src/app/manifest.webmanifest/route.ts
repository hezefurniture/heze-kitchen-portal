import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { updatedAt: true },
  });
  const v = settings?.updatedAt ? new Date(settings.updatedAt).getTime() : 0;

  // Use absolute URLs — some Android Chrome versions have issues with relative icon URLs
  // Behind reverse proxy, nextUrl.origin may be localhost — use X-Forwarded headers
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const origin = `${proto}://${host}`;

  const manifest = {
    id: "/",
    name: "Kitchens Portal - Heze Furniture",
    short_name: "Kitchens Portal",
    description: "Kitchen warehouse barcode scanning portal",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#7B2D5F",
    theme_color: "#7B2D5F",
    categories: ["business", "utilities"],
    icons: [
      {
        src: `${origin}/api/icon-192?v=${v}`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${origin}/api/icon-512?v=${v}`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
