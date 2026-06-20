export const dynamic = "force-dynamic";
import { getEmployees, getHeadcountByDept, getRequisitions } from "@/lib/queries";
import { ReportsView } from "./reports-view";

export default async function ReportsPage() {
  const [employees, headcountByDept, requisitions] = await Promise.all([
    getEmployees(),
    getHeadcountByDept(),
    getRequisitions(),
  ]);
  return (
    <ReportsView
      employees={employees}
      headcountByDept={headcountByDept}
      requisitions={requisitions}
    />
  );
}
