export const dynamic = "force-dynamic";
import { getLeaveRequests, getEmployees } from "@/lib/queries";
import { LeaveView } from "./leave-view";

export default async function LeavePage() {
  const [leave, employees] = await Promise.all([getLeaveRequests(), getEmployees()]);
  return <LeaveView initialLeave={leave} employees={employees} />;
}
