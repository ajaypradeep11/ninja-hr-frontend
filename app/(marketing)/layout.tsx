import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sora } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./marketing.css";

// Display face for the marketing pages only — the app itself stays on Inter.
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: `${BRAND.name} — People operations, the ninja way`,
  description:
    "NinjaHR runs hiring, onboarding, time off, performance and offboarding for Canadian teams — a LocalNinja product.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mkt ${sora.variable}`}>
      <header className="mkt-header">
        <div className="mkt-container mkt-nav-inner">
          <Link href="/" className="mkt-brand" aria-label={`${BRAND.name} home`}>
            <Image
              src="/logo-ring.png"
              alt=""
              width={2000}
              height={2000}
              priority
              className="mkt-brand-logo"
            />
            <span>
              Ninja<span className="mkt-brand-accent">HR</span>
            </span>
          </Link>
          <nav className="mkt-nav" aria-label="Primary">
            <Link href="/">Overview</Link>
            <Link href="/help">Help Center</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/login" className="mkt-btn mkt-btn-primary">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mkt-footer">
        <div className="mkt-container mkt-footer-inner">
          <span>
            © {new Date().getFullYear()} LocalNinja — {BRAND.name} is a LocalNinja product.
          </span>
          <a href="https://localninja.ca" target="_blank" rel="noopener noreferrer">
            localninja.ca
          </a>
          <Link href="/help">Help Center</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
