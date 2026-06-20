import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { OnboardingProvider } from "@/components/onboarding-store";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: BRAND.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}
