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
        className="text-white/50 text-xs underline mb-3"
      >
        Type barcode manually
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
          className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/30 text-white placeholder-white/40 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={submit}
          className="px-3 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition text-sm"
        >
          Go
        </button>
        <button
          onClick={() => { setExpanded(false); setValue(""); }}
          className="px-2 py-2 text-white/50 hover:text-white transition text-sm"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
