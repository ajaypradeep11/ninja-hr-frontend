import type { Metadata } from "next";
import { HELP_CATEGORIES } from "@/lib/help-content";
import { HelpBrowser } from "@/components/marketing/help-browser";

export const metadata: Metadata = {
  title: "Help Center — NinjaHR",
  description:
    "Step-by-step guides for NinjaHR: add and onboard employees, manage time off, hire, run reviews and more.",
};

export default function HelpPage() {
  return (
    <section className="mkt-section" style={{ paddingTop: "clamp(40px, 6vw, 64px)" }}>
      <div className="mkt-container">
        <div className="mkt-section-head">
          <p className="mkt-kicker">Help Center</p>
          <h2>How everything works, step by step.</h2>
          <p className="mkt-hud-note">
            {"// guides for HR admins and employees — search or jump from the sidebar"}
          </p>
        </div>
        <HelpBrowser categories={HELP_CATEGORIES} />
      </div>
    </section>
  );
}
