import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, name, password, role } = await req.json();

  if (!username || !name || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      name,
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    },
  });

  return NextResponse.json({ id: user.id });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, username, name, password, role } = await req.json();

  if (!id || !username || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const data: any = {
    username,
    name,
    role: role === "ADMIN" ? "ADMIN" : "USER",
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Don't allow deleting yourself
  if ((session.user as any).id === id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
