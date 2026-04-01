"use client";

import { useState, useRef, useEffect } from "react";

interface ScanInputProps {
  onSubmit: (value: string) => void;
}

/**
 * Auto-focused scan input for Zebra TC-27 DataWedge.
 *
 * Shows a subtle "Ready to scan" input that auto-focuses on mount and
 * re-focuses after interactions. DataWedge injects keystrokes into this
 * focused input. The readOnly attribute prevents the soft keyboard.
 *
 * Also includes a manual typing fallback that removes readOnly temporarily.
 */
export function ScanInput({ onSubmit }: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manualMode, setManualMode] = useState(false);
  const [value, setValue] = useState("");

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Re-focus periodically (recovers after popups, confirmations, etc.)
  useEffect(() => {
    const interval = setInterval(() => {
      if (manualMode) return;
      const active = document.activeElement;
      if (active && active !== inputRef.current) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      inputRef.current?.focus({ preventScroll: true });
    }, 1000);
    return () => clearInterval(interval);
  }, [manualMode]);

  // Re-focus on background tap
  useEffect(() => {
    const handleTap = () => {
      if (manualMode) return;
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 100);
    };
    document.addEventListener("touchend", handleTap);
    return () => document.removeEventListener("touchend", handleTap);
  }, [manualMode]);

  const handleManualSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const enterManualMode = () => {
    setManualMode(true);
    setValue("");
    // Need a tick for readOnly to be removed before focusing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const exitManualMode = () => {
    setManualMode(false);
    setValue("");
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  return (
    <div className="w-full max-w-md mb-3">
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          data-scan-input="true"
          readOnly={!manualMode}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && manualMode && value.trim()) {
              e.preventDefault();
              handleManualSubmit();
            }
          }}
          placeholder={manualMode ? "Type barcode..." : "Ready to scan..."}
          className={`flex-1 px-3 py-2 rounded border text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent transition ${
            manualMode
              ? "bg-white/10 border-white/30 text-white placeholder-white/40"
              : "bg-white/5 border-white/15 text-white/30 placeholder-white/30"
          }`}
        />
        {manualMode ? (
          <>
            <button
              onClick={handleManualSubmit}
              className="px-3 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition text-sm"
            >
              Go
            </button>
            <button
              onClick={exitManualMode}
              className="px-2 py-2 text-white/50 hover:text-white transition text-sm"
            >
              &times;
            </button>
          </>
        ) : (
          <button
            onClick={enterManualMode}
            className="text-white/40 text-xs underline whitespace-nowrap"
          >
            Type manually
          </button>
        )}
      </div>
    </div>
  );
}
