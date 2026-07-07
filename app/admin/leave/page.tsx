export const dynamic = "force-dynamic";
import { getLeaveRequests, getEmployees } from "@/lib/queries";
import { LeaveView } from "./leave-view";

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [leave, employees, params] = await Promise.all([
    getLeaveRequests(),
    getEmployees(),
    searchParams,
  ]);
  return <LeaveView initialLeave={leave} employees={employees} initialQuery={params.q ?? ""} />;
}
