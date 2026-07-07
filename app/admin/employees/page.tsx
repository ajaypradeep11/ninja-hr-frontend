export const dynamic = "force-dynamic";
import { getEmployees } from "@/lib/queries";
import { EmployeesList } from "./employees-list";

export default async function EmployeesPage() {
  const employees = await getEmployees();
  return <EmployeesList employees={employees} />;
}
