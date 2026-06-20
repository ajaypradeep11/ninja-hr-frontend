export const dynamic = "force-dynamic";
import { employeeLeaveBalances } from "@/lib/data";
import { getLeaveRequests } from "@/lib/queries";
import LeaveView from "./leave-view";

export default async function EmployeeLeave() {
  const myLeave = (await getLeaveRequests()).filter(
    (l) => l.employee === "Jim Scott",
  );
  const initialRows = myLeave.map((l) => ({
    id: l.id,
    type: l.type,
    start: l.start,
    end: l.end,
    status: l.status,
    days: l.days,
  }));

  return <LeaveView initialRows={initialRows} balances={employeeLeaveBalances} />;
}
