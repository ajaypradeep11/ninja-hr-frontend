export const dynamic = "force-dynamic";
import { getActor } from "@/lib/actor";
import { getEmployeeDetail } from "@/app/actions/employees";
import { getVaultDocuments } from "@/lib/queries";
import { ProfileView } from "./profile-view";

// Post-onboarding "My Profile": the HRIS record the employee built up during
// onboarding, rendered as a standard settings page. The backend allows
// self-reads (SIN/banking masked) and self-edits of contact fields only.
// The Documents tab hosts the personal filing cabinet (formerly /employee/documents).
export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await getActor();
  const [detail, allDocs, params] = await Promise.all([
    getEmployeeDetail(actor.employeeId),
    getVaultDocuments(),
    searchParams,
  ]);
  // Privacy: the vault is company-wide. Only employee-released documents may
  // reach this page — restricted entries (HR-Admin/medical, other employees'
  // files) must not be listed or included in "Export My Data".
  const documents = allDocs.filter((d) => d.access === "Employee");

  return (
    <ProfileView
      initial={detail}
      documents={documents}
      initialTab={params.tab === "documents" ? "documents" : "personal"}
    />
  );
}
