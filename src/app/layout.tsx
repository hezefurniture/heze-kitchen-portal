import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme-modern.css";
import { AuthProvider } from "@/components/layout/auth-provider";
import { getUiThemeState } from "@/lib/ui-theme";

export const metadata: Metadata = {
  title: "Kitchens Portal - Heze Furniture",
  description: "Kitchen warehouse barcode scanning portal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { effective } = await getUiThemeState();
  return (
    <html lang="en" data-ui={effective}>
      <head>
        <meta name="theme-color" content={effective === "modern" ? "#241A31" : "#1E1E2E"} />
        <meta name="color-scheme" content={effective === "modern" ? "dark" : "light"} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/api/icon-192" type="image/png" sizes="192x192" />
        <link rel="icon" href="/api/icon-512" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/api/icon-192" sizes="192x192" />
        <link rel="apple-touch-icon" href="/api/icon-512" sizes="512x512" />
      </head>
      <body className="touch-manipulation">
        <AuthProvider>{children}</AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
