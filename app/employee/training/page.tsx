export const dynamic = "force-dynamic";
import { GraduationCap, Lock, ShieldAlert } from "lucide-react";
import { Card, CardHeader, Button, Badge, ProgressBar } from "@/components/ui";
import { getTrainingCourses } from "@/lib/queries";
import type { TrainingCourse } from "@/lib/data";
import { provinceName } from "@/lib/compliance";
import { formatDate } from "@/lib/utils";

function CourseRow({ c }: { c: TrainingCourse }) {
  const status =
    c.progress === 100 ? "Completed" : c.progress > 0 ? "In progress" : "Not started";
  const tone = c.progress === 100 ? "green" : c.progress > 0 ? "amber" : "gray";
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line p-3.5">
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
          {c.mandatory && <Badge tone="brand">Mandatory</Badge>}
          {c.province && <Badge tone="gray">{provinceName(c.province)}</Badge>}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar value={c.progress} className="max-w-xs" />
          <span className="text-[11px] font-medium text-ink-muted">{c.progress}%</span>
          {c.due && (
            <span className="text-[11px] text-ink-faint">
              Due {formatDate(c.due, { year: undefined })}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={tone}>{status}</Badge>
        <Button size="sm" variant={c.progress === 100 ? "outline" : "primary"}>
          {c.progress === 100 ? "Review" : c.progress > 0 ? "Resume" : "Start"}
        </Button>
      </div>
    </div>
  );
}

export default async function EmployeeTraining() {
  const trainingCourses = await getTrainingCourses();
  const mandatory = trainingCourses.filter((c) => c.mandatory);
  const optional = trainingCourses.filter((c) => !c.mandatory);
  const overdue = mandatory.filter((c) => c.progress < 100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Training</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Mandatory courses are assigned automatically based on your province.
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You have {overdue.length} mandatory course{overdue.length > 1 ? "s" : ""} to finish.
            Mandatory training must be completed within 30 days of assignment or your account is
            flagged <span className="font-semibold">Non-Compliant</span>, restricting access to
            some modules.
          </span>
        </div>
      )}

      <Card className="card-pad">
        <CardHeader title="Mandatory" action={<Lock className="h-4 w-4 text-ink-faint" />} />
        <div className="mt-4 space-y-3">
          {mandatory.map((c) => (
            <CourseRow key={c.id} c={c} />
          ))}
        </div>
      </Card>

      <Card className="card-pad mt-5">
        <CardHeader title="Optional & Growth" />
        <div className="mt-4 space-y-3">
          {optional.map((c) => (
            <CourseRow key={c.id} c={c} />
          ))}
        </div>
      </Card>
    </div>
  );
}
