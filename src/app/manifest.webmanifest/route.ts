export const dynamic = "force-dynamic";

export async function GET() {
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
        src: "/api/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
