"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

const suppliers = [
  { name: "BRW", label: "BRW Kitchens", slug: "brw" },
  { name: "Extom", label: "Extom Kitchens", slug: "extom" },
  { name: "Akrylik", label: "Akrylik Kitchens", slug: "akrylik" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [mainLogo, setMainLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setMainLogo(data.mainLogo || null))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-primary flex flex-col overflow-x-hidden">
      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 px-3 py-1 flex justify-between items-center text-gray-700 text-xs z-50">
        <span className="truncate mr-2">User: {(session?.user as any)?.username || session?.user?.name || "..."}</span>
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center pb-16 px-4">
        {mainLogo ? (
          <img src={mainLogo} alt="Logo" className="h-24 sm:h-32 max-w-[300px] sm:max-w-[400px] object-contain mb-10 sm:mb-16" />
        ) : (
          <>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-1">KITCHENS</h1>
            <h2 className="text-5xl sm:text-6xl font-black text-white mb-10 sm:mb-16">PORTAL</h2>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 w-full max-w-xl sm:max-w-3xl">
          {suppliers.map((s) => (
            <Link
              key={s.slug}
              href={`/supplier/${s.slug}`}
              className="bg-white rounded-lg flex items-center justify-center text-center
                         border-4 border-accent hover:shadow-2xl hover:scale-105 transition-all duration-200
                         h-28 sm:h-40"
            >
              <span className="text-gray-700 font-bold text-xl leading-tight px-4">
                {s.name}<br />Kitchens
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
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
