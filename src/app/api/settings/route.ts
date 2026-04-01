import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json(
    settings || { id: "singleton", navLogo: null, mainLogo: null, appIcon192: null, appIcon512: null }
  );
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { navLogo, mainLogo, appIcon192, appIcon512 } = await req.json();

  // Validate size - base64 images can be large but cap at ~5MB each
  const MAX_SIZE = 7_000_000;
  if (navLogo && navLogo.length > MAX_SIZE) {
    return NextResponse.json({ error: "Nav logo too large (max 5MB)" }, { status: 400 });
  }
  if (mainLogo && mainLogo.length > MAX_SIZE) {
    return NextResponse.json({ error: "Main logo too large (max 5MB)" }, { status: 400 });
  }
  if (appIcon192 && appIcon192.length > MAX_SIZE) {
    return NextResponse.json({ error: "App icon (192) too large (max 5MB)" }, { status: 400 });
  }
  if (appIcon512 && appIcon512.length > MAX_SIZE) {
    return NextResponse.json({ error: "App icon (512) too large (max 5MB)" }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (navLogo !== undefined) update.navLogo = navLogo || null;
  if (mainLogo !== undefined) update.mainLogo = mainLogo || null;
  if (appIcon192 !== undefined) update.appIcon192 = appIcon192 || null;
  if (appIcon512 !== undefined) update.appIcon512 = appIcon512 || null;

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...update,
    },
    update,
  });

  return NextResponse.json(settings);
}
