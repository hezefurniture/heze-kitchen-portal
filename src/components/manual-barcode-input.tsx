"use client";

import { useState } from "react";

interface ManualBarcodeInputProps {
  onSubmit: (value: string) => void;
}

export function ManualBarcodeInput({ onSubmit }: ManualBarcodeInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");

  const submit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-3 min-h-[44px] px-4 rounded border border-white/40 text-white text-sm font-bold hover:bg-white/10 transition"
      >
        Type Barcode Manually
      </button>
    );
  }

  return (
    <div className="w-full max-w-md mb-3">
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Type barcode..."
          className="flex-1 min-w-0 min-h-[44px] px-3 py-2 rounded bg-white/10 border border-white/40 text-white placeholder-white/85 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={submit}
          className="min-h-[44px] min-w-[44px] px-4 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition text-sm"
        >
          Go
        </button>
        <button
          onClick={() => { setExpanded(false); setValue(""); }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white transition text-xl"
          aria-label="Close manual entry"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
