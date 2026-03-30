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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setNavLogo(data.navLogo || null))
      .catch(() => {});
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (path: string) => pathname?.includes(path);

  const navLinks = [
    { href: `/supplier/${slug}/delivery`, label: "New Delivery", key: "/delivery" },
    { href: `/supplier/${slug}/to-book`, label: "To Book", key: "/to-book" },
    { href: `/supplier/${slug}/in-stock`, label: "In Stock", key: "/in-stock" },
    { href: `/supplier/${slug}/archive`, label: "Archive", key: "/archive" },
  ];

  return (
    <>
      <header className="bg-header text-white sticky top-0 z-50">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left: logo + supplier */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Link href="/dashboard" className="shrink-0">
              {navLogo ? (
                <img src={navLogo} alt="Logo" className="h-8 max-w-[120px] object-contain" />
              ) : (
                <span className="text-xs font-bold leading-tight block">
                  <span className="text-[10px]">KITCHENS</span><br />
                  <span className="text-lg font-black">PORTAL</span>
                </span>
              )}
            </Link>
            <div className="flex flex-col shrink-0">
              <span className="bg-white text-gray-800 text-[10px] px-2 py-0.5 rounded font-bold text-center">
                {supplierName}
              </span>
              <Link href="/dashboard" className="text-yellow-400 text-[10px] hover:underline text-center">
                change &gt;
              </Link>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`text-sm font-bold px-3 py-1 rounded transition whitespace-nowrap ${
                  isActive(link.key) ? "bg-white/20 border border-white" : "border border-transparent hover:border-white/30"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden fixed top-[52px] left-0 right-0 bg-header z-50 shadow-xl border-t border-white/10">
          <nav className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`text-lg font-bold px-6 py-4 border-b border-white/10 ${
                  isActive(link.key) ? "bg-white/20 text-white" : "text-white/90 active:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 px-3 py-2 flex justify-between items-center text-gray-700 text-xs z-50">
        <span className="truncate mr-2">User: {(session?.user as any)?.username || session?.user?.name || "..."}</span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 hover:text-gray-900 min-h-[44px]"
          >
            <LogoutIcon /> <span className="font-bold">Logout</span>
          </button>
          <Link href={`/admin/users`} className="flex items-center gap-1 hover:text-gray-900 min-h-[44px]">
            <SettingsIcon />
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
