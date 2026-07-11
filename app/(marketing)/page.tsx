import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { Mascot } from "@/components/marketing/mascot";

const UNITS = [
  {
    code: "Unit 01 · Hiring",
    name: "Recruitment",
    pitch: "A full ATS with a public careers site — approvals, pipeline and scorecards in one dojo.",
    features: [
      "Kanban pipeline with AI screening — only humans can reject",
      "Bill 149-compliant postings with salary ranges",
      "Interview scorecards and panel debriefs",
    ],
  },
  {
    code: "Unit 02 · Day one",
    name: "Onboarding",
    pitch: "Send one invite link and the paperwork does itself — TD1s, direct deposit, handbook.",
    features: [
      "Guided 4-step wizard for the new hire",
      "Shared HR / Finance / IT checklist with blocking tasks",
      "Document verification gate before activation",
    ],
  },
  {
    code: "Unit 03 · Absence",
    name: "Time off & overtime",
    pitch: "Balances, a click-and-drag calendar, and approvals routed to the right manager.",
    features: [
      "Vacation, sick, personal, parental & overtime",
      "Manager approval queue with HR override",
      "Provincial policy validator (ESA-aware)",
    ],
  },
  {
    code: "Unit 04 · Growth",
    name: "Performance",
    pitch: "Reviews, goals and 1-on-1s people actually use — with watertight PIPs when needed.",
    features: [
      "Review cycles from self-eval to calibration",
      "Goal guardrails against out-of-band changes",
      "360° feedback, kudos and career paths",
    ],
  },
  {
    code: "Unit 05 · Records",
    name: "Documents & training",
    pitch: "A filing cabinet that routes itself, plus a course studio for company training.",
    features: [
      "Auto-routed uploads with Law 25-grade access control",
      "Read-only employee vault — export any time",
      "Build courses, assign them, track completion",
    ],
  },
  {
    code: "Unit 06 · Farewell",
    name: "Offboarding",
    pitch: "Role-based separation workflows that never forget to cut access or file the ROE.",
    features: [
      "Manager, IT and payroll task matrix",
      "Blocking-task gate before termination",
      "Access kill switch across integrations",
    ],
  },
  {
    code: "Unit 07 · The edge",
    name: "AI toolbox",
    pitch: "An HR copilot on every screen — plus letters and payroll rules that write themselves.",
    features: [
      "Letter Lab: templates filled from live HRIS data",
      "AI job descriptions with inclusive-language checks",
      "IF/THEN calculator engine for timesheets & bonuses",
    ],
  },
];

export default async function LandingPage() {
  // Signed-in users keep their old muscle memory: "/" still lands on the app.
  const jar = await cookies();
  if (process.env.FIREBASE_AUTH_DISABLED === "1" || jar.get(SESSION_COOKIE)?.value) {
    redirect("/admin");
  }

  return (
    <>
      <section className="mkt-hero">
        <div className="mkt-container mkt-hero-inner">
          <div>
            <p className="mkt-kicker">Silent. Swift. Effective — for people ops.</p>
            <h1>People operations that move like a ninja.</h1>
            <p className="mkt-hero-sub">
              NinjaHR is LocalNinja&apos;s agentic HR platform for Canadian teams. Hire, onboard,
              manage time off, grow your people and part ways cleanly — one system, from first
              job posting to final payout, without the paperwork.
            </p>
            <div className="mkt-hero-actions">
              <Link href="/login" className="mkt-btn mkt-btn-primary">
                Sign in
              </Link>
              <Link href="/help" className="mkt-btn mkt-btn-ghost">
                How it works
              </Link>
            </div>
          </div>
          <div className="mkt-hero-art" aria-hidden="true">
            <Mascot size={300} />
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container">
          <div className="mkt-section-head">
            <p className="mkt-kicker">What we do</p>
            <h2>The whole employee journey. One clan.</h2>
          </div>
          <div className="mkt-points">
            <div className="mkt-point">
              <span className="mkt-point-num">01</span>
              <h3>Hire</h3>
              <p>
                Open a requisition, generate the job description with AI, publish to your own
                careers site and job boards, and run candidates through a bias-guarded pipeline.
              </p>
            </div>
            <div className="mkt-point">
              <span className="mkt-point-num">02</span>
              <h3>Run</h3>
              <p>
                Onboarding, time off, documents, training and reviews run themselves — the agent
                does the chasing, your team does the work that matters.
              </p>
            </div>
            <div className="mkt-point">
              <span className="mkt-point-num">03</span>
              <h3>Protect</h3>
              <p>
                Built for Canadian compliance from day one: provincial ESA rules, Bill 149 salary
                transparency, Law 25 records, statutory leave locks and audit trails everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-container">
          <div className="mkt-section-head">
            <p className="mkt-kicker">Inside the platform</p>
            <h2>Seven units. Zero friction.</h2>
            <p className="mkt-hud-note">{"// everything below ships in NinjaHR today"}</p>
          </div>
          <div className="mkt-card-grid">
            {UNITS.map((u) => (
              <article key={u.name} className="mkt-card">
                <p className="mkt-card-code">{u.code}</p>
                <h3>{u.name}</h3>
                <p>{u.pitch}</p>
                <ul>
                  {u.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-container">
          <div className="mkt-band">
            <div>
              <h2>New here? Start with the guides.</h2>
              <p>
                Step-by-step walkthroughs for everything — from posting your first job to
                requesting a day off.
              </p>
            </div>
            <Link href="/help" className="mkt-btn mkt-btn-primary">
              Open the Help Center
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
