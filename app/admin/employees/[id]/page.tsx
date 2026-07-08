export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getEmployeeDetail } from "@/app/actions/employees";
import { getAllAssignments } from "@/app/actions/training";
import { EmployeeRecord } from "@/components/employees/employee-record";

export default async function EmployeeRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const [employee, allAssignments] = await Promise.all([
    getEmployeeDetail(id),
    // The employee's training record lives on their profile alongside documents.
    getAllAssignments().catch(() => []),
  ]);
  const training = allAssignments.filter((a) => a.employeeId === id);

  return (
    <div>
      <Link
        href="/admin/employees"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Employees
      </Link>
      <EmployeeRecord initial={employee} training={training} autoEdit={edit === "1"} />
    </div>
  );
}
