"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

const suppliers = [
  { name: "BRW", label: "BRW Kitchens", slug: "brw" },
  { name: "Extom", label: "Extom Kitchens", slug: "extom" },
  { name: "Akrylik", label: "Akrylik Kitchens", slug: "akrylik" },
];

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-primary flex flex-col">
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
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center pb-16">
        <h1 className="text-5xl font-bold text-white mb-1">KITCHENS</h1>
        <h2 className="text-6xl font-black text-white mb-16">PORTAL</h2>

        <div className="flex gap-8 flex-wrap justify-center">
          {suppliers.map((s) => (
            <Link
              key={s.slug}
              href={`/supplier/${s.slug}`}
              className="bg-white w-48 h-40 rounded-lg flex items-center justify-center text-center
                         border-4 border-accent hover:shadow-2xl hover:scale-105 transition-all duration-200"
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
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
