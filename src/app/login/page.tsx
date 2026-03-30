"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainLogo, setMainLogo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setMainLogo(data.mainLogo || null))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        {mainLogo ? (
          <img src={mainLogo} alt="Logo" className="h-32 max-w-[400px] object-contain mb-12 mx-auto" />
        ) : (
          <>
            <h1 className="text-5xl font-bold text-white mb-2">KITCHENS</h1>
            <h2 className="text-6xl font-black text-white mb-12">PORTAL</h2>
          </>
        )}

        <form onSubmit={handleSubmit} className="w-80 mx-auto space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded bg-white text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded bg-white text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
