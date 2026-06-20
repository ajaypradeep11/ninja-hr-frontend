export const dynamic = "force-dynamic";
import {
  Plug,
  FileUp,
  ShieldCheck,
  Lock,
  ScrollText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Stat,
  PageHeader,
} from "@/components/ui";
import { getBenefitsCarriers } from "@/lib/queries";
import { formatCAD, formatDate } from "@/lib/utils";

interface Discrepancy {
  employee: string;
  field: string;
  hrValue: string;
  carrierValue: string;
}

const discrepancies: Discrepancy[] = [
  { employee: "Angela Martin", field: "Dental tier", hrValue: "Family", carrierValue: "Single" },
  { employee: "Jim Scott", field: "Dependents", hrValue: "2", carrierValue: "1" },
  { employee: "Kelly Baker", field: "LTD election", hrValue: "Enrolled", carrierValue: "Not on file" },
];

const carrierTone = {
  Connected: "green",
  "File-based": "amber",
  "Not connected": "gray",
} as const;

export default async function BenefitsPage() {
  const benefitsCarriers = await getBenefitsCarriers();
  const totalEnrolled = benefitsCarriers.reduce((s, c) => s + c.enrolled, 0);

  return (
    <div>
      <PageHeader
        title="Benefits Integration"
        subtitle="Bridge to Canadian group carriers — automated enrollment, eligibility, and payroll sync."
        action={
          <Button>
            <Plug className="h-4 w-4" />
            Connect Carrier
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Enrolled employees" value={totalEnrolled} />
        <Stat label="Active carriers" value={benefitsCarriers.filter((c) => c.status !== "Not connected").length} />
        <Stat label="Open discrepancies" value={discrepancies.length} hint="Needs reconciliation" tone="amber" />
        <Stat label="Encryption" value="AES-256" hint="At rest & in transit" tone="green" />
      </div>

      {/* Carrier Connection Dashboard */}
      <Card className="card-pad mb-5">
        <CardHeader title="Carrier Connection Dashboard" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {benefitsCarriers.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{c.name}</p>
                <Badge tone={carrierTone[c.status]}>{c.status}</Badge>
              </div>
              <dl className="mt-3 space-y-1.5 text-xs text-ink-muted">
                <div className="flex justify-between">
                  <dt>Method</dt>
                  <dd className="font-medium text-ink-soft">{c.method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Enrolled</dt>
                  <dd className="font-medium text-ink-soft">{c.enrolled}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Last sync</dt>
                  <dd className="font-medium text-ink-soft">{c.lastSync}</dd>
                </div>
              </dl>
              <Button
                variant={c.status === "Connected" ? "outline" : "secondary"}
                size="sm"
                className="mt-4 w-full"
              >
                {c.status === "Connected" ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Sync now
                  </>
                ) : c.status === "File-based" ? (
                  <>
                    <FileUp className="h-3.5 w-3.5" /> Generate CSV / SFTP
                  </>
                ) : (
                  <>
                    <Plug className="h-3.5 w-3.5" /> Connect
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Hybrid model: modern REST APIs where available, automated encrypted CSV/EDI generation for
          legacy carriers via the universal normalized schema → carrier adapter.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Reconciliation */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader
            title="Reconciliation Dashboard"
            action={<Badge tone="amber">{discrepancies.length} flagged</Badge>}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Employee</th>
                  <th className="pb-2 font-semibold">Field</th>
                  <th className="pb-2 font-semibold">HR system</th>
                  <th className="pb-2 font-semibold">Carrier</th>
                  <th className="pb-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((d, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2.5 font-medium text-ink">{d.employee}</td>
                    <td className="py-2.5 text-ink-muted">{d.field}</td>
                    <td className="py-2.5">
                      <Badge tone="sky">{d.hrValue}</Badge>
                    </td>
                    <td className="py-2.5">
                      <Badge tone="red">{d.carrierValue}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payroll deduction sync */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader title="Payroll Deduction Sync" />
          <div className="mt-4 rounded-2xl bg-canvas p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-ink-soft">
                The premium for <span className="font-semibold text-ink">Angela Martin</span> has
                increased by <span className="font-semibold text-ink">{formatCAD(42.5)}</span>. Do you
                approve this update to the next payroll deduction cycle (
                {formatDate("2026-06-30", { year: undefined })})?
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve sync
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Review
              </Button>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 text-xs text-ink-muted">
            <li className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-500" /> Files encrypted AES-256 before leaving
              the system
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Benefits_Admin-only access to
              logs & file generation
            </li>
            <li className="flex items-center gap-2">
              <ScrollText className="h-3.5 w-3.5 text-emerald-500" /> Every API request & file logged
              to document_audit_trails
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
