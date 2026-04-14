"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const navLinks = [
    { href: "/admin/users", label: "Users" },
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/column-mappings", label: "Import Mappings" },
  ];

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <header className="bg-header text-white sticky top-0 z-50">
        {/* Mobile */}
        <div className="flex items-center justify-between px-3 py-3 lg:hidden">
          <Link href="/dashboard" className="text-lg font-black">
            ADMIN
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-white/10">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className={`text-lg font-bold px-6 py-4 border-b border-white/10 ${pathname === link.href ? "bg-white/20 text-white" : "text-white/90 active:bg-white/10"}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/dashboard" className="text-lg font-bold px-6 py-4 border-b border-white/10 text-white/90 active:bg-white/10">
                Back to Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                className="text-lg font-bold px-6 py-4 text-white/90 active:bg-white/10 text-left"
              >
                Logout
              </button>
            </nav>
          </div>
        )}

        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-black">
              KITCHENS PORTAL
            </Link>
            <span className="text-white/60">|</span>
            <span className="font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`${pathname === link.href ? "text-white font-bold" : "text-white/80 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
            <span className="text-white/30">|</span>
            <Link href="/dashboard" className="text-white/80 hover:text-white">
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
              className="text-white/80 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}
