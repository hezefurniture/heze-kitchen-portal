"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Captures barcode scans from Zebra DataWedge (and USB scanners).
 *
 * Works via three methods:
 * 1. Document-level keydown listener - captures DataWedge keystroke output
 *    without needing a focused input (most reliable on Zebra TC devices)
 * 2. DataWedge intent broadcast via BroadcastChannel (for Capacitor/Enterprise Browser)
 * 3. Fallback: a visible text input for manual entry
 *
 * DataWedge should be configured to output keystrokes with an ENTER suffix.
 * Barcode characters arrive as rapid keydown events, terminated by Enter.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // Method 1: Document-level keydown listener
  // DataWedge injects keystrokes at the OS level - no input focus needed
  useEffect(() => {
    const BUFFER_TIMEOUT = 100; // ms - reset buffer if gap between keys > this
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a real input/textarea (edit fields, search, etc.)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        const input = e.target as HTMLInputElement;
        // Allow scan capture from our dedicated scan input
        if (!input.dataset.scanInput) return;
      }

      const now = Date.now();

      // If it's been too long since last key, reset the buffer
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

  // Method 2: DataWedge intent via custom event
  // For setups where DataWedge broadcasts an intent instead of keystrokes
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

  // Return a manual submit handler for the visible input fallback
  const handleManualSubmit = useCallback((value: string) => {
    if (value.trim()) {
      onScanRef.current(value.trim());
    }
  }, []);

  return { handleManualSubmit };
}
