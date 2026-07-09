import type { ReactNode } from "react";
import LegalAcceptanceGate from "@/components/LegalAcceptanceGate";
import Navbar from "@/components/Navbar";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4eee5]">
      <Navbar />
      <main className="flex-1 bg-[#f4eee5]">
        <LegalAcceptanceGate>{children}</LegalAcceptanceGate>
      </main>
    </div>
  );
}
