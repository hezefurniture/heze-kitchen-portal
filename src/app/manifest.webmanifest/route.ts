import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
    select: { updatedAt: true },
  });
  const v = settings?.updatedAt ? new Date(settings.updatedAt).getTime() : 0;

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
        src: `/api/icon-192?v=${v}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/icon-512?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/api/icon-192?v=${v}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `/api/icon-512?v=${v}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
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
