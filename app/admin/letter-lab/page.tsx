export const dynamic = "force-dynamic";
import { getEmployees } from "@/lib/queries";
import { listLetterTemplates } from "@/app/actions/letters";
import { LetterLabView } from "./letter-lab-view";

export default async function LetterLabPage() {
  const [templates, employees] = await Promise.all([listLetterTemplates(), getEmployees()]);
  return (
    <LetterLabView
      initialTemplates={templates}
      employees={employees.filter((e) => e.status !== "Terminated")}
    />
  );
}
