"use client";

// Generic, schema-driven runner shared by every prompt tool in the library
// (admin and employee consoles): the tool's input schema declares the form,
// so 17+ agents share one maintained surface instead of 17 bespoke pages.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import { runTool, type ToolListItem, type ToolRunResult } from "@/app/actions/tools";

export function ToolRunner({ tool, backHref }: { tool: ToolListItem; backHref: string }) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<ToolRunResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const missingRequired = tool.inputs.some((f) => f.required && !(values[f.key] ?? "").trim());

  async function run() {
    setRunning(true);
    setError(null);
    try {
      // Only send non-empty fields; the backend validates the rest.
      const inputs = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim() !== ""),
      );
      setResult(await runTool(tool.slug, inputs));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "The tool run failed. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Tool Library
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{tool.name}</h1>
          <Badge tone="violet">
            <Sparkles className="h-3 w-3" /> AI Agent
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{tool.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Input form, generated from the tool's input schema */}
        <Card className="card-pad lg:col-span-5">
          <div className="space-y-4">
            {tool.inputs.map((field) => (
              <div key={field.key}>
                <label className="field-label" htmlFor={`tool-${field.key}`}>
                  {field.label}
                  {field.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={`tool-${field.key}`}
                    rows={6}
                    className="field-input resize-y"
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`tool-${field.key}`}
                    className="field-input"
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`tool-${field.key}`}
                    type="text"
                    className="field-input"
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <Button onClick={run} disabled={running || missingRequired} className="w-full">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Run {tool.name}
                </>
              )}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </Card>

        {/* Result */}
        <Card className="card-pad lg:col-span-7">
          {!result && !running && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-8 w-8 text-ink-faint" />
              <p className="text-sm font-semibold text-ink">The result will appear here</p>
              <p className="mt-1 max-w-xs text-sm text-ink-muted">
                Fill in the form and run the tool — output is generated by the guarded AI pipeline.
              </p>
            </div>
          )}
          {running && (
            <div className="flex h-full min-h-[260px] items-center justify-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> The agent is working…
            </div>
          )}
          {result && !running && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {result.blockedCategory ? (
                    <Badge tone="red">
                      <ShieldAlert className="h-3 w-3" /> Blocked by guardrails
                    </Badge>
                  ) : result.live ? (
                    <Badge tone="green">Live AI result</Badge>
                  ) : (
                    <Badge tone="amber">Offline fallback</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={copy} disabled={!!result.blockedCategory}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="text-sm leading-relaxed text-ink">
                <AssistantMarkdown>{result.text}</AssistantMarkdown>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
