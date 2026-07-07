export const dynamic = "force-dynamic";
import { getEmployees } from "@/lib/queries";
import { listCalcRules } from "@/app/actions/letters";
import { CalculatorView } from "./calculator-view";

export default async function CalculatorPage() {
  const [rules, employees] = await Promise.all([listCalcRules(), getEmployees()]);
  return (
    <CalculatorView
      initialRules={rules}
      employees={employees.filter((e) => e.status === "Active")}
    />
  );
}
