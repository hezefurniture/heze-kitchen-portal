"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const supplierNames: Record<string, string> = {
  brw: "BRW Kitchens",
  extom: "Extom Kitchens",
  akrylik: "Akrylik Kitchens",
};

export function Header() {
  const params = useParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  const slug = params?.slug as string;
  const supplierName = supplierNames[slug] || "";
  const [navLogo, setNavLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setNavLogo(data.navLogo || null))
      .catch(() => {});
  }, []);

  const isActive = (path: string) => pathname?.includes(path);

  return (
    <>
      <header className="bg-header text-white flex items-center justify-between px-4 py-2 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            {navLogo ? (
              <img src={navLogo} alt="Logo" className="h-8 max-w-[150px] object-contain" />
            ) : (
              <span className="text-xs font-bold leading-tight">
                <span className="text-[10px]">KITCHENS</span><br />
                <span className="text-lg font-black">PORTAL</span>
              </span>
            )}
          </Link>
          <div className="flex flex-col ml-4">
            <span className="bg-white text-gray-800 text-xs px-3 py-0.5 rounded font-bold text-center">
              {supplierName}
            </span>
            <Link href="/dashboard" className="text-yellow-400 text-[10px] hover:underline text-center">
              change supplier &gt;
            </Link>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href={`/supplier/${slug}/delivery`}
            className={`text-lg font-bold px-4 py-1 rounded transition ${
              isActive("/delivery") ? "bg-white/20 border border-white" : "border border-transparent hover:border-white/30"
            }`}
          >
            New Delivery
          </Link>
          <Link
            href={`/supplier/${slug}/to-book`}
            className={`text-lg font-bold px-4 py-1 rounded transition ${
              isActive("/to-book") ? "bg-white/20 border border-white" : "border border-transparent hover:border-white/30"
            }`}
          >
            Kitchens to Book
          </Link>
          <Link
            href={`/supplier/${slug}/in-stock`}
            className={`text-lg font-bold px-4 py-1 rounded transition ${
              isActive("/in-stock") ? "bg-white/20 border border-white" : "border border-transparent hover:border-white/30"
            }`}
          >
            Kitchens In Stock
          </Link>
          <Link
            href={`/supplier/${slug}/archive`}
            className={`text-lg font-bold px-4 py-1 rounded transition ${
              isActive("/archive") ? "bg-white/20 border border-white" : "border border-transparent hover:border-white/30"
            }`}
          >
            Archive
          </Link>
        </nav>
      </header>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 px-6 py-2 flex justify-between items-center text-gray-700 text-sm z-50">
        <span>User: {(session?.user as any)?.username || session?.user?.name || "..."}</span>
        <span className="font-medium">Heze Furniture 2026</span>
        <div className="flex gap-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 hover:text-gray-900"
          >
            <LogoutIcon /> <span className="font-bold">Logout</span>
          </button>
          <Link href={`/admin/users`} className="flex items-center gap-1 hover:text-gray-900">
            <SettingsIcon /> <span className="font-bold">Settings</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
