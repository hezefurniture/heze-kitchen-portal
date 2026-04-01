"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Captures barcode scans from Zebra DataWedge (and USB scanners).
 *
 * DataWedge keystroke output injects keystrokes into the focused element.
 * This hook captures those keystrokes via document-level keydown listener.
 * A focused input with data-scan-input is required for DataWedge to inject.
 *
 * DataWedge should be configured with keystroke output + ENTER suffix.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // Document-level keydown listener — captures DataWedge keystrokes
  useEffect(() => {
    const BUFFER_TIMEOUT = 100; // ms gap between keys to reset buffer
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Ignore regular inputs (search fields, text areas, etc.)
      // but ALLOW our dedicated scan input elements
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        const inputEl = e.target as HTMLInputElement;
        if (!inputEl.dataset.scanInput) return;
      }

      const now = Date.now();
      if (now - lastKeyTime.current > BUFFER_TIMEOUT) {
        bufferRef.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          e.preventDefault();
          const barcode = bufferRef.current;
          bufferRef.current = "";
          onScanRef.current(barcode);
        }
        return;
      }

      // Only accumulate printable characters
      if (e.key.length === 1) {
        e.preventDefault();
        bufferRef.current += e.key;

        // Safety: reset buffer after timeout in case Enter never comes
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          bufferRef.current = "";
        }, 500);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  // DataWedge intent via custom event (for Capacitor/Enterprise Browser)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.barcode) {
        onScanRef.current(detail.barcode);
      }
    };
    window.addEventListener("datawedge-scan", handler);
    return () => window.removeEventListener("datawedge-scan", handler);
  }, []);

  const handleManualSubmit = useCallback((value: string) => {
    if (value.trim()) {
      onScanRef.current(value.trim());
    }
  }, []);

  return { handleManualSubmit };
}
