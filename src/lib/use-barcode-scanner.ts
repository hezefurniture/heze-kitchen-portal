"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Captures barcode scans from Zebra DataWedge (and USB scanners).
 *
 * DataWedge on Android uses InputConnection.commitText() to inject text,
 * which fires `input` events — NOT `keydown` events. This hook uses
 * three capture methods to ensure reliability:
 *
 * 1. Hidden focused input with `input` event listener — captures DataWedge
 *    text injection on Android. The input uses inputMode="none" to suppress
 *    the soft keyboard. A submit timer fires after 150ms of no new input.
 * 2. Document-level keydown listener — fallback for desktop USB scanners
 *    that DO fire keydown events.
 * 3. DataWedge intent broadcast via custom event (for Capacitor/Enterprise Browser)
 *
 * DataWedge should be configured with keystroke output + ENTER suffix.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  onScanRef.current = onScan;

  const submitBarcode = useCallback((barcode: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    // Clean: strip trailing newlines/carriage returns (Enter suffix)
    const clean = barcode.replace(/[\r\n]+$/, "").trim();
    if (clean.length > 0) {
      onScanRef.current(clean);
    }
    // Reset after a short delay to prevent double-processing
    setTimeout(() => { processingRef.current = false; }, 300);
  }, []);

  // Method 1: Hidden focused input for DataWedge on Android
  // DataWedge uses InputConnection.commitText() which triggers `input` events
  useEffect(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("inputmode", "none"); // suppress keyboard
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-scan-input", "true");
    // Position on-screen but invisible — Android may not focus truly offscreen inputs
    input.style.position = "fixed";
    input.style.top = "0";
    input.style.left = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0.01"; // near-invisible but Android still focuses it
    input.style.zIndex = "-1";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.padding = "0";
    input.style.margin = "0";
    input.style.caretColor = "transparent";
    document.body.appendChild(input);
    hiddenInputRef.current = input;

    // Focus the hidden input
    const focusInput = () => {
      const active = document.activeElement as HTMLElement | null;
      // Don't steal focus from manual barcode input or other user inputs
      if (active && active !== input && active !== document.body) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (active.closest('[role="dialog"]') || active.closest('[role="alertdialog"]')) return;
      }
      input.focus({ preventScroll: true });
    };

    focusInput();

    // Listen for `input` events — this is how DataWedge delivers text on Android
    const handleInput = () => {
      const value = input.value;
      if (!value) return;

      // Check if value contains newline (Enter suffix arrived as part of text)
      if (value.includes("\n") || value.includes("\r")) {
        if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
        input.value = "";
        bufferRef.current = "";
        submitBarcode(value);
        return;
      }

      // Buffer the value — DataWedge may send all at once or character by character
      // Wait 150ms for more input before submitting
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
        const finalValue = input.value;
        if (finalValue.trim()) {
          input.value = "";
          bufferRef.current = "";
          submitBarcode(finalValue);
        }
      }, 150);
    };

    // Listen for Enter keydown on the hidden input specifically
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
        const value = input.value;
        input.value = "";
        if (value.trim()) {
          bufferRef.current = "";
          submitBarcode(value);
        } else if (bufferRef.current.trim()) {
          const barcode = bufferRef.current;
          bufferRef.current = "";
          submitBarcode(barcode);
        }
      }
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleKeyDown);

    // Re-focus on taps on page background
    const handleTap = (e: Event) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (target.closest("button") || target.closest("a") || target.closest("input")) return;
      setTimeout(() => focusInput(), 50);
    };

    // Re-focus periodically to recover after dialogs, popups, etc.
    const refocusInterval = setInterval(focusInput, 1000);

    document.addEventListener("click", handleTap);
    document.addEventListener("touchend", handleTap);

    return () => {
      clearInterval(refocusInterval);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      document.removeEventListener("click", handleTap);
      document.removeEventListener("touchend", handleTap);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKeyDown);
      if (input.parentNode) input.parentNode.removeChild(input);
      hiddenInputRef.current = null;
    };
  }, [submitBarcode]);

  // Method 2: Document-level keydown listener (desktop USB scanners)
  // USB scanners fire real keydown events, captured here as a fallback
  useEffect(() => {
    const BUFFER_TIMEOUT = 100;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Skip if typing in a real input (but allow our hidden scan input)
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        const inputEl = e.target as HTMLInputElement;
        if (!inputEl.dataset.scanInput) return;
        // For our hidden input, Method 1 handles it — skip here to avoid double processing
        return;
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
          submitBarcode(barcode);
        }
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        bufferRef.current += e.key;
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { bufferRef.current = ""; }, 500);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [submitBarcode]);

  // Method 3: DataWedge intent via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.barcode) {
        submitBarcode(detail.barcode);
      }
    };
    window.addEventListener("datawedge-scan", handler);
    return () => window.removeEventListener("datawedge-scan", handler);
  }, [submitBarcode]);

  // Manual submit handler for the collapsible manual input fallback
  const handleManualSubmit = useCallback((value: string) => {
    if (value.trim()) {
      onScanRef.current(value.trim());
    }
  }, []);

  return { handleManualSubmit };
}
