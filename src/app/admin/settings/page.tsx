"use client";

import { useState, useEffect, useRef } from "react";

export default function SettingsPage() {
  const [navLogo, setNavLogo] = useState<string | null>(null);
  const [mainLogo, setMainLogo] = useState<string | null>(null);
  const [appIcon192, setAppIcon192] = useState<string | null>(null);
  const [appIcon512, setAppIcon512] = useState<string | null>(null);
  const [ambiguousBarcodes, setAmbiguousBarcodes] = useState<string[]>([]);
  const [newBarcode, setNewBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const icon192InputRef = useRef<HTMLInputElement>(null);
  const icon512InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setNavLogo(data.navLogo || null);
        setMainLogo(data.mainLogo || null);
        setAppIcon192(data.appIcon192 || null);
        setAppIcon512(data.appIcon512 || null);
        try {
          const parsed = JSON.parse(data.extomAmbiguousBarcodes || "[]");
          if (Array.isArray(parsed)) setAmbiguousBarcodes(parsed);
        } catch {
          setAmbiguousBarcodes([]);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navLogo,
          mainLogo,
          appIcon192,
          appIcon512,
          extomAmbiguousBarcodes: JSON.stringify(ambiguousBarcodes),
        }),
      });
      if (res.ok) {
        setMessage("Settings saved successfully");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setMessage("Failed to save settings");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-black text-white mb-8">Settings</h1>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded text-white font-bold ${message.includes("success") ? "bg-green-500" : "bg-red-500"}`}>
          {message}
        </div>
      )}

      {/* Nav Logo */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Navigation Logo</h2>
        <p className="text-sm text-gray-500 mb-4">Shown in the header bar. Recommended: small horizontal logo.</p>
        {navLogo ? (
          <div className="mb-4">
            <div className="bg-header rounded p-4 inline-block mb-3">
              <img src={navLogo} alt="Nav logo preview" className="h-10 max-w-[200px] object-contain" />
            </div>
            <br />
            <button
              onClick={() => { setNavLogo(null); if (navInputRef.current) navInputRef.current.value = ""; }}
              className="text-red-500 text-sm font-bold hover:text-red-700"
            >
              Remove Logo
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <p className="text-gray-400 mb-2">No logo uploaded</p>
          </div>
        )}
        <input
          ref={navInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, setNavLogo)}
          className="text-sm text-gray-600"
        />
      </div>

      {/* Main Logo */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Main Logo</h2>
        <p className="text-sm text-gray-500 mb-4">Shown on the login page and dashboard. Recommended: larger logo.</p>
        {mainLogo ? (
          <div className="mb-4">
            <div className="bg-primary rounded p-6 inline-block mb-3">
              <img src={mainLogo} alt="Main logo preview" className="h-24 max-w-[400px] object-contain" />
            </div>
            <br />
            <button
              onClick={() => { setMainLogo(null); if (mainInputRef.current) mainInputRef.current.value = ""; }}
              className="text-red-500 text-sm font-bold hover:text-red-700"
            >
              Remove Logo
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <p className="text-gray-400 mb-2">No logo uploaded</p>
          </div>
        )}
        <input
          ref={mainInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, setMainLogo)}
          className="text-sm text-gray-600"
        />
      </div>

      {/* App Icons */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">App Icons (PWA)</h2>
        <p className="text-sm text-gray-500 mb-4">Icons used when the app is installed on a device. Upload square PNG images.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 192x192 icon */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">192 x 192 px</h3>
            {appIcon192 ? (
              <div className="mb-3">
                <div className="bg-gray-100 rounded p-3 inline-block mb-2 border border-gray-200">
                  <img src={appIcon192} alt="App icon 192" className="w-16 h-16 object-contain" />
                </div>
                <br />
                <button
                  onClick={() => { setAppIcon192(null); if (icon192InputRef.current) icon192InputRef.current.value = ""; }}
                  className="text-red-500 text-sm font-bold hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3">
                <p className="text-gray-400 text-sm">No icon</p>
              </div>
            )}
            <input
              ref={icon192InputRef}
              type="file"
              accept="image/png"
              onChange={(e) => handleFileSelect(e, setAppIcon192)}
              className="text-sm text-gray-600 w-full"
            />
          </div>

          {/* 512x512 icon */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">512 x 512 px</h3>
            {appIcon512 ? (
              <div className="mb-3">
                <div className="bg-gray-100 rounded p-3 inline-block mb-2 border border-gray-200">
                  <img src={appIcon512} alt="App icon 512" className="w-16 h-16 object-contain" />
                </div>
                <br />
                <button
                  onClick={() => { setAppIcon512(null); if (icon512InputRef.current) icon512InputRef.current.value = ""; }}
                  className="text-red-500 text-sm font-bold hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3">
                <p className="text-gray-400 text-sm">No icon</p>
              </div>
            )}
            <input
              ref={icon512InputRef}
              type="file"
              accept="image/png"
              onChange={(e) => handleFileSelect(e, setAppIcon512)}
              className="text-sm text-gray-600 w-full"
            />
          </div>
        </div>
      </div>

      {/* Extom Ambiguous Barcodes */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Extom - Ambiguous Barcodes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Barcodes shared by multiple boxes of the same cabinet. When one of these is scanned,
          the operator will be asked to pick which item was actually received.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = newBarcode.trim();
                if (trimmed && !ambiguousBarcodes.includes(trimmed)) {
                  setAmbiguousBarcodes((prev) => [...prev, trimmed]);
                  setNewBarcode("");
                }
              }
            }}
            placeholder="Enter barcode..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = newBarcode.trim();
              if (trimmed && !ambiguousBarcodes.includes(trimmed)) {
                setAmbiguousBarcodes((prev) => [...prev, trimmed]);
                setNewBarcode("");
              }
            }}
            className="px-4 py-2 bg-accent text-white font-bold text-sm rounded hover:bg-accent-light transition"
          >
            Add
          </button>
        </div>

        {ambiguousBarcodes.length > 0 ? (
          <div className="space-y-1">
            {ambiguousBarcodes.map((bc) => (
              <div
                key={bc}
                className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 border border-gray-200"
              >
                <span className="text-gray-800 font-mono text-sm">{bc}</span>
                <button
                  onClick={() => setAmbiguousBarcodes((prev) => prev.filter((b) => b !== bc))}
                  className="text-red-500 text-sm font-bold hover:text-red-700 ml-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No ambiguous barcodes configured.</p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
