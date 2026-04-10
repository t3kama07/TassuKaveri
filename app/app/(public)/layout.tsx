import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import PublicSiteFooter from "@/components/PublicSiteFooter";

export default function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <PublicSiteFooter />
    </div>
  );
}
