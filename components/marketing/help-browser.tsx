"use client";

import * as React from "react";
import type { HelpCategory, HelpGuide } from "@/lib/help-content";

const AUDIENCE_LABEL = {
  admin: "HR admins",
  employee: "Employees",
  everyone: "Everyone",
} as const;

/** Render a step's `**label**` markers as <strong> without an md dependency. */
function StepText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}

function guideMatches(guide: HelpGuide, query: string) {
  const haystack = [
    guide.title,
    guide.summary,
    ...guide.steps.map((s) => `${s.text} ${s.detail ?? ""}`),
    ...(guide.tips ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export function HelpBrowser({ categories }: { categories: HelpCategory[] }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const visible = categories
    .map((cat) => ({
      ...cat,
      guides: q ? cat.guides.filter((g) => guideMatches(g, q)) : cat.guides,
    }))
    .filter((cat) => cat.guides.length > 0);

  return (
    <div className="mkt-help-layout">
      <aside className="mkt-help-sidebar">
        <input
          type="search"
          className="mkt-help-search"
          placeholder="Search guides…"
          aria-label="Search guides"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav aria-label="Guides">
          {visible.map((cat) => (
            <div key={cat.id}>
              <p className="mkt-help-cat-title">{cat.title}</p>
              {cat.guides.map((g) => (
                <a key={g.slug} href={`#${g.slug}`}>
                  {g.title}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="mkt-help-main">
        {visible.length === 0 && (
          <div className="mkt-help-empty">
            <p>No guides match “{query}”.</p>
            <p>Try a different word — or ask the AI assistant once you&apos;re signed in.</p>
          </div>
        )}
        {visible.map((cat) => (
          <React.Fragment key={cat.id}>
            <h2 className="mkt-help-cat-head">{cat.title}</h2>
            {cat.guides.map((g) => (
              <section key={g.slug} id={g.slug} className="mkt-guide">
                <div className="mkt-guide-head">
                  <h3>{g.title}</h3>
                  <span className="mkt-guide-badge" data-audience={g.audience}>
                    {AUDIENCE_LABEL[g.audience]}
                  </span>
                </div>
                <p className="mkt-guide-summary">{g.summary}</p>
                <ol className="mkt-steps">
                  {g.steps.map((step, i) => (
                    <li key={i}>
                      <span className="mkt-step-text">
                        <StepText text={step.text} />
                        {step.detail && <span className="mkt-step-detail">{step.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
                {g.tips && g.tips.length > 0 && (
                  <div className="mkt-tips">
                    {g.tips.map((tip, i) => (
                      <p key={i}>{tip}</p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
