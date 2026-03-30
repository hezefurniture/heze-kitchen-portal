"use client";

import { useState, useEffect, useRef } from "react";

export default function SettingsPage() {
  const [navLogo, setNavLogo] = useState<string | null>(null);
  const [mainLogo, setMainLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setNavLogo(data.navLogo || null);
        setMainLogo(data.mainLogo || null);
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
        body: JSON.stringify({ navLogo, mainLogo }),
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
      <h1 className="text-3xl font-black text-white mb-8">Logo Settings</h1>

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
