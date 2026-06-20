export const dynamic = "force-dynamic";
import { getPerformanceReviews, getPips } from "@/lib/queries";
import { PerformanceView } from "./performance-view";

export default async function PerformancePage() {
  const [reviews, pips] = await Promise.all([getPerformanceReviews(), getPips()]);
  return <PerformanceView initialReviews={reviews} initialPips={pips} />;
}
