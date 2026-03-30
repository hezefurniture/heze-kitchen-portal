"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the screen awake using the Wake Lock API.
 * Essential for handheld scanners like Zebra TC27 where the screen
 * must stay on during warehouse scanning sessions.
 */
export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {}
    };

    requestWakeLock();

    // Re-acquire on visibility change (e.g. switching back to browser)
    const handleVisibility = () => {
      if (active && document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);
}
