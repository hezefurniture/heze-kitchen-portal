import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json(settings || { id: "singleton", navLogo: null, mainLogo: null });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { navLogo, mainLogo } = await req.json();

  // Validate size - base64 images can be large but cap at ~5MB each
  if (navLogo && navLogo.length > 7_000_000) {
    return NextResponse.json({ error: "Nav logo too large (max 5MB)" }, { status: 400 });
  }
  if (mainLogo && mainLogo.length > 7_000_000) {
    return NextResponse.json({ error: "Main logo too large (max 5MB)" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      navLogo: navLogo || null,
      mainLogo: mainLogo || null,
    },
    update: {
      ...(navLogo !== undefined ? { navLogo: navLogo || null } : {}),
      ...(mainLogo !== undefined ? { mainLogo: mainLogo || null } : {}),
    },
  });

  return NextResponse.json(settings);
}
