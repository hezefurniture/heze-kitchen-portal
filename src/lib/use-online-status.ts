"use client";

import { useState, useEffect, useCallback } from "react";
import { flushQueue, getQueueLength } from "./offline-queue";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueueCount(getQueueLength());

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush queue when back online
      flushQueue().then(({ succeeded }) => {
        setQueueCount(getQueueLength());
        if (succeeded > 0) {
          window.dispatchEvent(new CustomEvent("scans-flushed", { detail: { count: succeeded } }));
        }
      });
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshQueueCount = useCallback(() => {
    setQueueCount(getQueueLength());
  }, []);

  return { isOnline, queueCount, refreshQueueCount };
}
