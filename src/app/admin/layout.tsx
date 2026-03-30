"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <header className="bg-header text-white flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-black">
            KITCHENS PORTAL
          </Link>
          <span className="text-white/60">|</span>
          <span className="font-bold">Admin Settings</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-white/80 hover:text-white">
            Back to Dashboard
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/80 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}
