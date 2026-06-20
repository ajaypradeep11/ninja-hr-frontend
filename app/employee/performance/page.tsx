export const dynamic = "force-dynamic";
import {
  ArrowRight,
  CalendarClock,
  Lock,
  MessageSquare,
  Target,
} from "lucide-react";
import { Card, CardHeader, Button, Badge, ProgressBar, Ring } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { getPerformanceReviews } from "@/lib/queries";

interface Goal {
  id: string;
  title: string;
  progress: number;
  due: string;
}

const goals: Goal[] = [
  { id: "g1", title: "Close $1.2M in net-new pipeline (Q2)", progress: 72, due: "2026-06-30" },
  { id: "g2", title: "Complete Solution Selling certification", progress: 40, due: "2026-07-31" },
  { id: "g3", title: "Mentor one new SDR through ramp", progress: 90, due: "2026-06-20" },
];

interface HistoryReview {
  id: string;
  cycle: string;
  date: string;
  score?: number;
  released: boolean;
}

export default async function EmployeeGrowth() {
  const myReviews = (await getPerformanceReviews()).filter(
    (r) => r.employee === "Jim Scott",
  );
  const history: HistoryReview[] = myReviews.map((r) => ({
    id: r.id,
    cycle: r.cycle,
    date: r.due,
    score: r.score,
    released: r.state === "Completed",
  }));
  const avgGoal = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">My Growth</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Own your development — track goals, reviews, and self-evaluations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Goals */}
        <Card className="card-pad lg:col-span-8">
          <CardHeader
            title="Active Goals"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Target className="h-3.5 w-3.5" /> {avgGoal}% avg
              </span>
            }
          />
          <div className="mt-4 space-y-4">
            {goals.map((g) => (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-soft">{g.title}</p>
                  <span className="text-xs text-ink-faint">
                    Due {formatDate(g.due, { year: undefined })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={g.progress} />
                  <span className="w-9 text-right text-xs font-semibold text-ink-soft">
                    {g.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Overall ring */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader title="Overall" />
          <div className="flex flex-col items-center py-3">
            <Ring value={avgGoal} sublabel="Goals" />
            <p className="mt-3 text-center text-xs text-ink-muted">
              You&apos;re on track this cycle. Keep the momentum!
            </p>
          </div>
        </Card>

        {/* Upcoming milestone */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader title="Upcoming Milestone" />
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-canvas p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">90-Day Probationary Review</p>
              <p className="text-xs text-ink-muted">with Michael Scott · Jun 25, 2026</p>
            </div>
          </div>
        </Card>

        {/* Self-evaluation */}
        <Card className="card-pad lg:col-span-7 flex flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div>
            <MessageSquare className="h-6 w-6" />
            <h3 className="mt-3 text-base font-bold">Self-Evaluation is open</h3>
            <p className="mt-1 max-w-md text-sm text-white/80">
              Share your wins and growth areas before your manager&apos;s review. Your input shapes
              a two-way conversation — due in 5 days.
            </p>
          </div>
          <button className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-white/90">
            Start Self-Evaluation <ArrowRight className="h-4 w-4" />
          </button>
        </Card>

        {/* History */}
        <Card className="card-pad lg:col-span-12">
          <CardHeader title="Review History" />
          <div className="mt-3 divide-y divide-line">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{h.cycle}</p>
                  <p className="text-xs text-ink-muted">{formatDate(h.date)}</p>
                </div>
                {h.released ? (
                  <>
                    {h.score && <Badge tone="green">{h.score.toFixed(1)} / 5</Badge>}
                    <Button size="sm" variant="outline">View</Button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                    <Lock className="h-3.5 w-3.5" /> Locked until released by HR
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Internal manager calibration notes are never shown here — you only see feedback once
            it has been formally released.
          </p>
        </Card>
      </div>
    </div>
  );
}
