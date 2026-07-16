"use client";

import * as React from "react";
import { BookOpen, FileUp, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  deletePolicyDocument,
  listPolicyDocuments,
  retryPolicyIngestion,
  uploadPolicyDocument,
  type PolicyDocumentSummary,
} from "@/app/actions/policies";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const STATUS_TONE: Record<PolicyDocumentSummary["status"], "amber" | "green" | "red"> = {
  Processing: "amber",
  Ready: "green",
  Failed: "red",
};

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function PoliciesView({ initial }: { initial: PolicyDocumentSummary[] }) {
  const [documents, setDocuments] = React.useState(initial);
  const [mode, setMode] = React.useState<"pdf" | "text">("pdf");
  const [title, setTitle] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; base64: string } | null>(null);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const processing = documents.some(({ status }) => status === "Processing");

  React.useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => {
      void listPolicyDocuments()
        .then(setDocuments)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [processing]);

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError(null);
    if (selected.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      setError("The handbook PDF must be under 4MB.");
      return;
    }
    setFile({ name: selected.name, base64: toBase64(await selected.arrayBuffer()) });
    if (!title.trim()) setTitle(selected.name.replace(/\.pdf$/i, ""));
  }

  const canUpload =
    !busy && title.trim().length > 0 && (mode === "pdf" ? file !== null : text.trim().length > 0);

  async function upload() {
    if (!canUpload) return;
    setBusy(true);
    setError(null);
    try {
      setDocuments(
        await uploadPolicyDocument({
          title: title.trim(),
          sourceType: mode,
          base64: mode === "pdf" ? file?.base64 : undefined,
          text: mode === "text" ? text.trim() : undefined,
        }),
      );
      setTitle("");
      setFile(null);
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function retry(id: string) {
    setBusy(true);
    setError(null);
    try {
      setDocuments(await retryPolicyIngestion(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retry failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        "Delete this handbook? The AI assistant will stop answering policy questions.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDocuments(await deletePolicyDocument(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Policy Handbook"
        subtitle="Upload your employee manual so the AI assistant can answer policy questions with citations."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="card-pad">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Current Handbook
              </span>
            }
          />
          {documents.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No handbook uploaded"
                description="Upload a PDF or paste the handbook text so the assistant can answer policy questions."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {documents.map((document) => (
                <li key={document.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{document.title}</p>
                      <p className="text-xs text-ink-muted">
                        {document.sourceType === "pdf" ? "PDF" : "Pasted text"} · uploaded{" "}
                        {new Date(document.uploadedAt).toLocaleDateString()}
                        {document.status === "Ready"
                          ? ` · ${document.chunkCount} sections indexed`
                          : null}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[document.status]}>
                      {document.status === "Processing" ? "Processing…" : document.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {document.status === "Failed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void retry(document.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void remove(document.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="card-pad">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-600 dark:text-brand-400" />{" "}
                {documents.length > 0 ? "Replace Handbook" : "Upload Handbook"}
              </span>
            }
          />
          <p className="mt-1 text-xs text-ink-muted">
            One handbook per workspace — uploading a new one replaces the current handbook.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label" htmlFor="policy-title">
                Title
              </label>
              <input
                id="policy-title"
                className="field-input"
                placeholder="Employee Manual 2026"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(["pdf", "text"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    mode === option
                      ? "border-brand-300 bg-brand-50 text-brand-700 dark:text-brand-400"
                      : "border-line text-ink-muted hover:bg-canvas",
                  )}
                >
                  {option === "pdf" ? "Upload PDF" : "Paste text"}
                </button>
              ))}
            </div>
            {mode === "pdf" ? (
              <div>
                <label className="field-label" htmlFor="policy-file">
                  Handbook PDF (max 4MB)
                </label>
                <input
                  id="policy-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => void selectFile(event)}
                  className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-600"
                />
                {file ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <FileUp className="h-3.5 w-3.5" /> {file.name}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="field-label" htmlFor="policy-text">
                  Handbook text (markdown headings become citable sections)
                </label>
                <textarea
                  id="policy-text"
                  className="field-input min-h-[180px]"
                  placeholder={"# Vacation\n\nEmployees receive…"}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </div>
            )}
            {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
            <Button onClick={() => void upload()} disabled={!canUpload}>
              <Upload className="h-4 w-4" />{" "}
              {busy ? "Uploading…" : documents.length > 0 ? "Replace handbook" : "Upload handbook"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
