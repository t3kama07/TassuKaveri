import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import EmailSubscriptionPopup from "@/components/EmailSubscriptionPopup";
import SeoScripts from "@/components/SeoScripts";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "TassuKaveri - Pet Care Exchange",
  description: "Credit-based pet-sitting exchange platform for Finland",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TassuKaveri",
    title: "TassuKaveri - Pet Care Exchange",
    description: "Credit-based pet-sitting exchange platform for Finland",
    images: [
      {
        url: "/images/heroimage.webp",
        width: 1200,
        height: 630,
        alt: "TassuKaveri community pet care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TassuKaveri - Pet Care Exchange",
    description: "Credit-based pet-sitting exchange platform for Finland",
    images: ["/images/heroimage.webp"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <SeoScripts />
        <AuthProvider>
          <LanguageProvider>
            {children}
            <EmailSubscriptionPopup />
            <CookieConsentBanner />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
