import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/layout/auth-provider";

export const metadata: Metadata = {
  title: "Kitchens Portal - Heze Furniture",
  description: "Kitchen warehouse barcode scanning portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
