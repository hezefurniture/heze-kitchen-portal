"use client";

import { useEffect, useRef, useState } from "react";

interface EditableQtyProps {
  value: number;
  max: number;
  onChange: (next: number) => Promise<void> | void;
  /**
   * If true, calls confirm() before invoking onChange. Used by the
   * "Last scanned" panel where the user wants a guard rail.
   */
  confirmBeforeSave?: boolean;
  confirmMessage?: string;
  className?: string;
}

export function EditableQty({
  value,
  max,
  onChange,
  confirmBeforeSave = false,
  confirmMessage = "Update quantity?",
  className = "",
}: EditableQtyProps) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-sync from props when not actively editing
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = async () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > max) {
      setDraft(String(value));
      return;
    }
    if (parsed === value) return;
    if (confirmBeforeSave) {
      const ok = window.confirm(`${confirmMessage}\n\n${value} → ${parsed}`);
      if (!ok) {
        setDraft(String(value));
        return;
      }
    }
    try {
      await onChange(parsed);
    } catch {
      setDraft(String(value));
    }
  };

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={draft}
      onFocus={(e) => {
        setEditing(true);
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setDraft(String(value));
          setEditing(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`w-full max-w-full text-center bg-white border border-gray-300 rounded text-gray-800 text-xs sm:text-sm py-0.5 px-0 focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
    />
  );
}
