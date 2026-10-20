"use client";

import { useCallback, useEffect, useState } from "react";

interface SyncStatus {
  unsynced: number;
  packages: { code: string; error: string | null; attempts: number }[];
}

export function AkrylikSyncBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/akrylik/sync");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/akrylik/sync", { method: "POST" });
      if (res.ok) setStatus(await res.json());
    } catch {
    } finally {
      setRetrying(false);
    }
  };

  if (!status || status.unsynced === 0) return null;

  return (
    <div className="w-full max-w-4xl bg-amber-100 text-amber-900 rounded-lg px-4 py-3 mb-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>{status.unsynced}</strong> received box{status.unsynced !== 1 ? "es have" : " has"} not been
          confirmed to Akrylik yet.
        </span>
        <div className="flex gap-3">
          <button onClick={() => setShowDetails((v) => !v)} className="underline font-bold">
            {showDetails ? "Hide" : "Details"}
          </button>
          <button
            onClick={retry}
            disabled={retrying}
            className="px-3 py-1 rounded bg-amber-700 text-white font-bold disabled:opacity-50"
          >
            {retrying ? "Retrying..." : "Retry now"}
          </button>
        </div>
      </div>
      {showDetails && (
        <ul className="mt-2 space-y-1 text-xs">
          {status.packages.map((p) => (
            <li key={p.code} className="break-all">
              <span className="font-mono">{p.code}</span>
              {p.error ? ` — ${p.error}` : " — waiting to send"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
