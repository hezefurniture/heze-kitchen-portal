"use client";

import { useState, useEffect, useRef } from "react";
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
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setNavLogo(data.navLogo || null))
      .catch(() => {});
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Measure actual header height for mobile dropdown positioning
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  });

  const isActive = (path: string) => {
    if (!pathname) return false;
    // More precise matching to avoid /to-book matching /in-stock
    const segments = pathname.split("/");
    const keySegment = path.replace("/", "");
    return segments.includes(keySegment);
  };

  const navLinks = [
    { href: `/supplier/${slug}/delivery`, label: "New Delivery", key: "/delivery" },
    { href: `/supplier/${slug}/to-book`, label: "To Book", key: "/to-book" },
    { href: `/supplier/${slug}/in-stock`, label: "In Stock", key: "/in-stock" },
    { href: `/supplier/${slug}/additions`, label: "Additions", key: "/additions" },
    { href: `/supplier/${slug}/archive`, label: "Archive", key: "/archive" },
  ];

  const LogoBlock = () =>
    navLogo ? (
      <img src={navLogo} alt="Logo" className="h-10 max-w-[120px] object-contain block" />
    ) : (
      <span className="font-bold leading-none block">
        <span className="text-[9px] tracking-wider block">KITCHENS</span>
        <span className="text-xl font-black block -mt-0.5">PORTAL</span>
      </span>
    );

  return (
    <>
      <header ref={headerRef} className="bg-header text-white sticky top-0 z-50">
        {/* Mobile: 3-column grid — logo left, supplier center, hamburger right */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 py-3 lg:hidden">
          <Link href="/dashboard" className="shrink-0 self-center flex items-center">
            <LogoBlock />
          </Link>
          <div className="flex flex-col items-center justify-self-center self-center">
            <span className="bg-white text-gray-800 text-[11px] px-2 py-0.5 rounded font-bold leading-tight">
              {supplierName}
            </span>
            <Link href="/dashboard" className="text-yellow-400 text-[10px] hover:underline leading-tight mt-0.5">
              change &gt;
            </Link>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center justify-self-end self-center"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>

        {/* Desktop: flex layout with nav links */}
        <div className="hidden lg:flex items-center justify-between px-3 py-2">
          <Link href="/dashboard" className="shrink-0">
            <LogoBlock />
          </Link>
          <nav className="flex items-center gap-3">
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
          <div className="flex flex-col items-center shrink-0">
            <span className="bg-white text-gray-800 text-[11px] px-2 py-0.5 rounded font-bold leading-tight">
              {supplierName}
            </span>
            <Link href="/dashboard" className="text-yellow-400 text-[10px] hover:underline leading-tight mt-0.5">
              change &gt;
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu — positioned dynamically below header */}
      {menuOpen && (
        <div
          className="lg:hidden fixed left-0 right-0 bg-header z-50 shadow-xl border-t border-white/10"
          style={{ top: headerHeight }}
        >
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

      {/* Footer — icons only */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 px-3 py-1 flex justify-between items-center text-gray-700 text-xs z-50">
        <span className="truncate mr-2">User: {(session?.user as any)?.username || session?.user?.name || "..."}</span>
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="hover:text-gray-900 min-h-[44px] flex items-center justify-center"
            title="Logout"
          >
            <LogoutIcon />
          </button>
          <Link href="/admin/users" className="hover:text-gray-900 min-h-[44px] flex items-center justify-center" title="Settings">
            <GearIcon />
          </Link>
        </div>
      </div>
    </>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
