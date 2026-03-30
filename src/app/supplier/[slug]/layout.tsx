import { Header } from "@/components/layout/header";

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Header />
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}
