"use client";

import * as React from "react";
import {
  AlertTriangle,
  Cake,
  GraduationCap,
  GripVertical,
  PartyPopper,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  PageHeader,
  ProgressBar,
} from "@/components/ui";
import type { TrainingCourse, Employee, UpcomingEvent } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { provinceName, probationStatus } from "@/lib/compliance";
import { BRAND } from "@/lib/brand";

const checklistTemplate = [
  "Set up desk & workspace",
  "Order hardware",
  "Assign onboarding buddy",
  "Schedule week-1 1:1",
  "Add to team channels",
];

function trainingStatus(course: TrainingCourse) {
  if (course.progress >= 100) return { label: "Compliant", tone: "green" as const };
  if (course.due && course.due < BRAND.today)
    return { label: "Non-Compliant", tone: "red" as const };
  return { label: "In Progress", tone: "amber" as const };
}

interface TrackerViewProps {
  trainingCourses: TrainingCourse[];
  employees: Employee[];
  upcomingEvents: UpcomingEvent[];
}

export function TrackerView({ trainingCourses, employees, upcomingEvents }: TrackerViewProps) {
  const [publicRecognition, setPublicRecognition] = React.useState(true);

  const mandatory = trainingCourses.filter((c) => c.mandatory);

  const probationWatch = employees
    .map((e) => ({ e, p: probationStatus(e.hireDate, BRAND.today) }))
    .filter(({ p }) => p.daysEmployed >= 0 && p.daysEmployed <= 100)
    .sort((a, b) => b.p.daysEmployed - a.p.daysEmployed);

  const milestones = upcomingEvents.filter(
    (ev) => ev.kind === "anniversary" || ev.kind === "birthday",
  );

  return (
    <div>
      <PageHeader
        title="Lifecycle Tracker"
        subtitle="Mandatory training, probation milestones and recognition — with the agent doing the chasing."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Mandatory training tracker */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader
            title="Mandatory Training Tracker"
            action={<ShieldCheck className="h-4 w-4 text-brand-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Province-specific courses are auto-assigned. Accounts flag{" "}
            <span className="font-semibold text-red-600">Non-Compliant</span> when overdue.
          </p>
          <div className="mt-4 space-y-3">
            {mandatory.map((c) => {
              const st = trainingStatus(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-line p-3.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                      {c.province && <Badge tone="gray">{c.province}</Badge>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar
                        value={c.progress}
                        tone={c.progress >= 100 ? "green" : "amber"}
                        className="h-1"
                      />
                      <span className="text-[11px] font-medium text-ink-muted">
                        {c.progress}%
                      </span>
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Checklist builder mock */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="Checklist Builder"
            action={
              <button className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                <Plus className="h-3.5 w-3.5" /> Add task
              </button>
            }
          />
          <p className="mt-1 text-xs text-ink-muted">
            Drag to reorder — &ldquo;Senior Dev Onboarding&rdquo; template. No code change needed.
          </p>
          <div className="mt-4 space-y-2">
            {checklistTemplate.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-3 text-sm text-ink-soft"
              >
                <GripVertical className="h-4 w-4 text-ink-faint" />
                {t}
              </div>
            ))}
          </div>
        </Card>

        {/* Probation watchlist */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader title="Probation Watchlist" />
          <p className="mt-1 text-xs text-ink-muted">
            The system flags records at the 60-day mark to complete review before Day 80.
          </p>
          <div className="mt-4 space-y-3">
            {probationWatch.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-muted">
                No employees currently in a probationary window.
              </p>
            )}
            {probationWatch.map(({ e, p }) => (
              <div key={e.id} className="rounded-xl border border-line p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={e.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {e.title} · {provinceName(e.province)}
                    </p>
                  </div>
                  <Badge tone={p.due ? "red" : "amber"}>
                    Day {p.daysEmployed} of 90
                  </Badge>
                </div>
                {p.due && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Action required: {e.name} is approaching their 90-day milestone (
                      {p.daysToMilestone} days left). Complete the probationary review before Day
                      80 to determine extension or termination before statutory notice applies.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Milestone calendar */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="Milestone Calendar"
            action={
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-muted">
                Public recognition
                <button
                  type="button"
                  onClick={() => setPublicRecognition((v) => !v)}
                  className={
                    publicRecognition
                      ? "relative h-5 w-9 rounded-full bg-brand-500 transition-colors"
                      : "relative h-5 w-9 rounded-full bg-line transition-colors"
                  }
                >
                  <span
                    className={
                      publicRecognition
                        ? "absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                        : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    }
                  />
                </button>
              </label>
            }
          />
          <div className="mt-4 space-y-3">
            {milestones.map((ev) => {
              const Icon = ev.kind === "anniversary" ? PartyPopper : Cake;
              return (
                <div key={ev.id} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {publicRecognition ? ev.subtitle : "Private milestone"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {ev.title} · {formatDate(ev.date, { year: undefined })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {!publicRecognition && (
            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Recognition hidden to respect employee privacy preferences (Law 25).
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
