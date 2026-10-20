import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUiThemeState, isUiTheme } from "@/lib/ui-theme";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getUiThemeState());
}

// Sets the signed-in user's own appearance; `theme: null` goes back to the admin default.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { theme } = await req.json().catch(() => ({ theme: undefined }));
  if (theme !== null && !isUiTheme(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { uiTheme: theme } });
  return NextResponse.json(await getUiThemeState());
}
