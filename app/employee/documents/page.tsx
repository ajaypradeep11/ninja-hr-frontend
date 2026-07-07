import { redirect } from "next/navigation";

// Documents moved into My Profile → Documents tab. Keep old links working.
export default function EmployeeDocuments() {
  redirect("/employee/profile?tab=documents");
}
