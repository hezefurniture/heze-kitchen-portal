"use client";

import { useEffect, useState } from "react";
import type { UiTheme, UiThemeState } from "@/lib/ui-theme";

const LABELS: Record<UiTheme, string> = { classic: "Classic", modern: "Modern" };
const THEME_COLOR: Record<UiTheme, string> = { classic: "#7B2D5F", modern: "#140E1D" };

export function applyUiTheme(theme: UiTheme) {
  document.documentElement.dataset.ui = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

export function AppearancePicker({ className = "" }: { className?: string }) {
  const [state, setState] = useState<UiThemeState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ui-theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setState(data))
      .catch(() => {});
  }, []);

  if (!state) return null;

  const onChange = async (value: string) => {
    const theme = value === "default" ? null : (value as UiTheme);
    const previous = state;
    const optimistic = { ...state, userTheme: theme, effective: theme ?? state.defaultTheme };
    setState(optimistic);
    applyUiTheme(optimistic.effective);
    setSaving(true);
    try {
      const res = await fetch("/api/ui-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error();
      setState(await res.json());
    } catch {
      setState(previous);
      applyUiTheme(previous.effective);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={`appearance-picker inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">Appearance</span>
      <PaletteIcon />
      <select
        value={state.userTheme ?? "default"}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className="bg-transparent font-bold cursor-pointer min-h-[44px] pr-1"
        aria-label="Appearance"
      >
        <option className="text-gray-900" value="default">Default ({LABELS[state.defaultTheme]})</option>
        <option className="text-gray-900" value="classic">Classic</option>
        <option className="text-gray-900" value="modern">Modern</option>
      </select>
    </label>
  );
}

function PaletteIcon() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
