import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { ThemeProvider } from "@/components/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: BRAND.tagline,
  icons: {
    icon: "/logo-ring.png",
    apple: "/logo-ring.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: next-themes stamps the theme class on <html>
    // before hydration, which React would otherwise flag as a mismatch.
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        {/* OnboardingProvider is deliberately NOT here: it fetches on mount,
            and the signed-out pages under this layout (/login, /welcome/:token)
            have no session to fetch with. Each shell mounts its own. */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
