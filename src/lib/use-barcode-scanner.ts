"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Captures barcode scans from Zebra DataWedge (and USB scanners).
 *
 * Works via three methods:
 * 1. Hidden focused input - DataWedge on Android injects keystrokes into the
 *    focused input. A hidden off-screen input stays focused to capture these.
 *    inputMode="none" prevents the soft keyboard from appearing.
 * 2. Document-level keydown listener - fallback for desktop USB scanners
 * 3. DataWedge intent broadcast via custom event (for Capacitor/Enterprise Browser)
 *
 * DataWedge should be configured to output keystrokes with an ENTER suffix.
 * Barcode characters arrive as rapid keydown events, terminated by Enter.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  onScanRef.current = onScan;

  // Method 1: Hidden focused input for DataWedge keystroke capture on Android
  // DataWedge injects keystrokes into the focused element - without a focused
  // input, keystrokes are lost on Android WebView/Chrome
  useEffect(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("inputmode", "none"); // suppress keyboard
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("data-scan-input", "true");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "-9999px";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    document.body.appendChild(input);
    hiddenInputRef.current = input;

    // Focus the hidden input
    const focusInput = () => {
      // Don't steal focus from manual barcode input or other user inputs
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) {
        if (active !== input) return; // user is typing somewhere, don't steal
      }
      input.focus({ preventScroll: true });
    };

    focusInput();

    // Re-focus when user taps on the page background (not on an interactive element)
    const handleTap = (e: Event) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      // Don't steal focus from buttons, links, inputs
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (target.closest("button") || target.closest("a") || target.closest("input")) return;
      setTimeout(() => focusInput(), 50);
    };

    // Re-focus periodically to recover after dialogs, confirmations, etc.
    const refocusInterval = setInterval(focusInput, 2000);

    document.addEventListener("click", handleTap);

    return () => {
      clearInterval(refocusInterval);
      document.removeEventListener("click", handleTap);
      if (input.parentNode) input.parentNode.removeChild(input);
      hiddenInputRef.current = null;
    };
  }, []);

  // Method 2: Document-level keydown listener (captures from hidden input + desktop USB scanners)
  useEffect(() => {
    const BUFFER_TIMEOUT = 100; // ms - reset buffer if gap between keys > this
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a real input/textarea (edit fields, search, etc.)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        const input = e.target as HTMLInputElement;
        // Allow scan capture from our dedicated hidden scan input
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
          // Clear the hidden input value
          if (hiddenInputRef.current) hiddenInputRef.current.value = "";
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
          if (hiddenInputRef.current) hiddenInputRef.current.value = "";
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
