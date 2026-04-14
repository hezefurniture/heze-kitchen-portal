import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import QRCode from "qrcode";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }
  return session;
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

// GET: return the user's existing login token + SVG QR code. Creates a token
// on the fly if the user does not have one yet.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, username: true, name: true, loginToken: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!user.loginToken) {
    const token = generateToken();
    user = await prisma.user.update({
      where: { id: params.id },
      data: { loginToken: token },
      select: { id: true, username: true, name: true, loginToken: true },
    });
  }

  const svg = await QRCode.toString(user.loginToken!, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });

  return NextResponse.json({
    username: user.username,
    name: user.name,
    token: user.loginToken,
    svg,
  });
}

// POST: regenerate the user's login token (invalidates existing QR codes).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = generateToken();
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { loginToken: token },
    select: { id: true, username: true, name: true, loginToken: true },
  });

  const svg = await QRCode.toString(user.loginToken!, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });

  return NextResponse.json({
    username: user.username,
    name: user.name,
    token: user.loginToken,
    svg,
  });
}
