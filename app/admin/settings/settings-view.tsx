"use client";

import * as React from "react";
import {
  Building2,
  ListChecks,
  MapPin,
  ShieldCheck,
  Plug,
  Palette,
  Check,
  CircleCheckBig,
  Save,
} from "lucide-react";
import { Card, CardHeader, Badge, PageHeader, Button } from "@/components/ui";
import { PROVINCES } from "@/lib/compliance";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { saveSettings } from "@/app/actions/modules";
import {
  getDepartmentOptions,
  getJobTitleOptions,
  saveDepartmentOptions,
  saveJobTitleOptions,
} from "@/app/actions/onboarding";
import type { CompanySettings, Integrations } from "@/lib/queries";

const roles = ["Employee", "Manager", "HR_Admin", "Super_Admin"] as const;
const modules = ["Recruitment", "Leave", "Documents", "Performance", "Offboarding", "Reports"];

const rbac: Record<string, (typeof roles)[number][]> = {
  Recruitment: ["HR_Admin", "Super_Admin"],
  Leave: ["Employee", "Manager", "HR_Admin", "Super_Admin"],
  Documents: ["Employee", "Manager", "HR_Admin", "Super_Admin"],
  Performance: ["Manager", "HR_Admin", "Super_Admin"],
  Offboarding: ["HR_Admin", "Super_Admin"],
  Reports: ["HR_Admin", "Super_Admin"],
};

// UI label -> DB integration key.
const INTEGRATION_FIELDS: { key: keyof Integrations; name: string }[] = [
  { key: "google", name: "Google Workspace" },
  { key: "m365", name: "Microsoft 365" },
  { key: "slack", name: "Slack" },
  { key: "sharepoint", name: "SharePoint" },
  { key: "esign", name: "Xodo Sign (e-signature)" },
  { key: "quickbooks", name: "QuickBooks Online" },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-brand-500" : "bg-line")}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsView({ initial }: { initial: CompanySettings }) {
  const [companyName, setCompanyName] = React.useState(initial.companyName);
  const [activeProvinces, setActiveProvinces] = React.useState<string[]>(initial.provinces);
  const [ints, setInts] = React.useState<Integrations>(initial.integrations);
  const [recognitionPublic, setRecognitionPublic] = React.useState(initial.recognitionPublic);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  function toggleProvince(code: string) {
    setActiveProvinces((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
    setSaved(false);
  }

  function toggleInt(key: keyof Integrations) {
    setInts((x) => ({ ...x, [key]: !x[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const next = await saveSettings({
        companyName,
        provinces: activeProvinces,
        integrations: ints,
        recognitionPublic,
      });
      setCompanyName(next.companyName);
      setActiveProvinces(next.provinces);
      setInts(next.integrations);
      setRecognitionPublic(next.recognitionPublic);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace, compliance, and integrations."
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Company profile */}
        <Card className="card-pad">
          <CardHeader title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Company Profile</span>} />
          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label">Legal entity name</label>
              <input
                className="field-input"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Headcount</label>
                <input className="field-input" defaultValue="45" />
              </div>
              <div>
                <label className="field-label">Data residency</label>
                <input className="field-input" defaultValue="AWS Canada (Montreal)" />
              </div>
            </div>
          </div>
        </Card>

        {/* Provinces of operation */}
        <Card className="card-pad">
          <CardHeader title={<span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Provinces of Operation</span>} />
          <p className="mt-1 text-xs text-ink-muted">
            Determines which ESA rules, training, and policies the engine enforces.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PROVINCES.map((p) => {
              const on = activeProvinces.includes(p.code);
              return (
                <button
                  key={p.code}
                  onClick={() => toggleProvince(p.code)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    on ? "border-brand-300 bg-brand-50 text-brand-700 dark:text-brand-400" : "border-line text-ink-muted hover:bg-canvas",
                  )}
                >
                  {on && <Check className="h-3 w-3" />}
                  {p.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* RBAC */}
        <Card className="card-pad lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Roles &amp; Permissions</span>} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Module</th>
                  {roles.map((r) => (
                    <th key={r} className="pb-2 text-center font-semibold">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m} className="border-t border-line">
                    <td className="py-2.5 font-medium text-ink">{m}</td>
                    {roles.map((r) => (
                      <td key={r} className="py-2.5 text-center">
                        {rbac[m]?.includes(r) ? (
                          <CircleCheckBig className="mx-auto h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">
            Note: 05_Leaves_and_Medical is masked from Managers regardless of module access (human
            rights / medical privacy).
          </p>
        </Card>

        {/* Compliance feed */}
        <Card className="card-pad lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Option Lists</span>} />
          <p className="mt-1 text-xs text-ink-muted">
            The dropdown choices offered across the app (Add Employee, Launch Onboarding). Add,
            rename or remove — changes apply company-wide immediately.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <OptionListEditor
              title="Departments"
              load={getDepartmentOptions}
              save={saveDepartmentOptions}
            />
            <OptionListEditor
              title="Job titles"
              load={getJobTitleOptions}
              save={saveJobTitleOptions}
            />
          </div>
        </Card>

        <Card className="card-pad">
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Compliance Feed</span>} />
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-canvas p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Compliance Works</p>
              <p className="text-xs text-ink-muted">
                Real-time provincial ESA / Bill 149 / Law 25 regulatory feed
              </p>
            </div>
            <Badge tone="green">Connected</Badge>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-line p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Public recognition</p>
              <p className="text-xs text-ink-muted">Show anniversaries &amp; birthdays company-wide (Law 25 opt-in)</p>
            </div>
            <Toggle on={recognitionPublic} onClick={() => { setRecognitionPublic((v) => !v); setSaved(false); }} />
          </div>
        </Card>

        {/* Branding */}
        <Card className="card-pad">
          <CardHeader title={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Branding</span>} />
          <div className="mt-4">
            <label className="field-label">Product name</label>
            <input
              className="field-input"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setSaved(false);
              }}
            />
            <p className="mt-2 text-[11px] text-ink-faint">
              Company display name persists to the database. Product branding stays in{" "}
              <code className="rounded bg-canvas px-1">lib/brand.ts</code> (currently {BRAND.name}).
            </p>
          </div>
        </Card>

        {/* Integrations */}
        <Card className="card-pad lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><Plug className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Integrations</span>} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRATION_FIELDS.map((it) => (
              <div key={it.key} className="flex items-center justify-between rounded-2xl border border-line p-3.5">
                <span className="text-sm font-medium text-ink-soft">{it.name}</span>
                <Toggle on={ints[it.key]} onClick={() => toggleInt(it.key)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}


/** Admin CRUD for one option list (departments / job titles): add, inline
 *  rename, delete. Every mutation persists the whole list via the settings PUT. */
function OptionListEditor({
  title,
  load,
  save,
}: {
  title: string;
  load: () => Promise<string[]>;
  save: (items: string[]) => Promise<string[]>;
}) {
  const [items, setItems] = React.useState<string[] | null>(null);
  const [draft, setDraft] = React.useState("");
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void load().then(setItems).catch(() => setError("Could not load the list."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: string[]) {
    setBusy(true);
    setError(null);
    try {
      setItems(await save(next));
    } catch {
      setError("Save failed — try again.");
      setItems(await load().catch(() => items));
    } finally {
      setBusy(false);
    }
  }

  if (!items) return <p className="text-xs text-ink-faint">{error ?? "Loading…"}</p>;

  const input = "h-9 w-full rounded-lg border border-line bg-canvas px-2.5 text-sm outline-none focus:border-brand-300 focus:bg-card";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={item} className="flex items-center gap-1.5">
            {editing === i ? (
              <>
                <input
                  autoFocus
                  className={input}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = editText.trim();
                      if (v && v !== item) void persist(items.map((x, j) => (j === i ? v : x)));
                      setEditing(null);
                    }
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const v = editText.trim();
                    if (v && v !== item) void persist(items.map((x, j) => (j === i ? v : x)));
                    setEditing(null);
                  }}
                  className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-ink-soft">
                  {item}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(i);
                    setEditText(item);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-canvas dark:text-brand-400"
                >
                  Rename
                </button>
                <button
                  type="button"
                  disabled={busy || items.length <= 1}
                  title={items.length <= 1 ? "Keep at least one option" : `Remove ${item}`}
                  onClick={() => void persist(items.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Remove
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-1.5">
        <input
          className={input}
          placeholder={`Add a ${title.toLowerCase().replace(/s$/, "")}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = draft.trim();
              if (v) {
                void persist([...items, v]);
                setDraft("");
              }
            }
          }}
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => {
            const v = draft.trim();
            if (v) {
              void persist([...items, v]);
              setDraft("");
            }
          }}
          className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
}
