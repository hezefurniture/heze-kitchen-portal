"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBarcodeScanner } from "@/lib/use-barcode-scanner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainLogo, setMainLogo] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "qr">("password");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setMainLogo(data.mainLogo || null))
      .catch(() => {});
  }, []);

  const signInWithToken = useCallback(async (token: string) => {
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      token,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid QR code");
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  // Hook into existing barcode scanner (DataWedge / USB) — only when in QR mode
  const handleScannerInput = useCallback((value: string) => {
    if (mode !== "qr") return;
    signInWithToken(value);
  }, [mode, signInWithToken]);

  useBarcodeScanner(handleScannerInput);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    // Check BarcodeDetector availability
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      setCameraError("Camera QR scanning is not supported on this browser. Use a hardware scanner or enter credentials.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      const detector = new BD({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || !cameraStreamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue;
            if (raw) {
              stopCamera();
              signInWithToken(raw);
              return;
            }
          }
        } catch {
          // Ignore intermittent detection errors
        }
        scanLoopRef.current = requestAnimationFrame(scan);
      };
      scanLoopRef.current = requestAnimationFrame(scan);
    } catch (e) {
      setCameraError("Could not access camera. Please allow camera permission.");
    }
  }, [signInWithToken, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (mode !== "qr") stopCamera();
  }, [mode, stopCamera]);

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
    <div className="min-h-screen bg-primary flex items-center justify-center py-8">
      <div className="text-center">
        {mainLogo ? (
          <img src={mainLogo} alt="Logo" className="h-32 max-w-[400px] object-contain mb-8 mx-auto" />
        ) : (
          <>
            <h1 className="text-5xl font-bold text-white mb-2">KITCHENS</h1>
            <h2 className="text-6xl font-black text-white mb-8">PORTAL</h2>
          </>
        )}

        <div className="flex justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`px-4 py-2 rounded font-bold transition ${
              mode === "password"
                ? "bg-accent text-white"
                : "border border-white/40 text-white/70 hover:text-white"
            }`}
          >
            Username
          </button>
          <button
            type="button"
            onClick={() => setMode("qr")}
            className={`px-4 py-2 rounded font-bold transition ${
              mode === "qr"
                ? "bg-accent text-white"
                : "border border-white/40 text-white/70 hover:text-white"
            }`}
          >
            QR Code
          </button>
        </div>

        {mode === "password" && (
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
        )}

        {mode === "qr" && (
          <div className="w-80 mx-auto space-y-4">
            <p className="text-white/80 text-sm">
              Scan your login QR code using a hardware scanner, or use the device camera.
            </p>
            {!cameraActive && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition"
              >
                Scan with camera
              </button>
            )}
            {cameraActive && (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full rounded border-2 border-accent bg-black"
                  style={{ aspectRatio: "1/1", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-2 rounded border border-white/60 text-white/80 font-bold hover:bg-white/10 transition"
                >
                  Stop camera
                </button>
              </div>
            )}
            {cameraError && <p className="text-yellow-300 text-sm">{cameraError}</p>}
            {loading && <p className="text-white/80 text-sm">Signing in...</p>}
            {error && <p className="text-red-300 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
