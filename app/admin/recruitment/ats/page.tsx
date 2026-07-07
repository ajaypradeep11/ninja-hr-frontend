export const dynamic = "force-dynamic";
import { getRequisitionCandidates, listRequisitions } from "@/app/actions/recruitment";
import { AtsView } from "./ats-view";

export default async function AtsPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req } = await searchParams;
  const requisitions = (await listRequisitions()).filter(
    (r) => r.status === "Published" || r.applicants > 0,
  );
  const selectedId = req && requisitions.some((r) => r.id === req) ? req : requisitions[0]?.id;
  const candidates = selectedId ? await getRequisitionCandidates(selectedId) : [];

  return (
    <AtsView
      requisitions={requisitions.map((r) => ({
        id: r.id,
        title: r.title,
        province: r.province,
        applicants: r.applicants,
      }))}
      selectedId={selectedId}
      initial={candidates}
    />
  );
}
