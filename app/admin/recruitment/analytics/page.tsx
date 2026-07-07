export const dynamic = "force-dynamic";
import { getRecruitmentAnalytics } from "@/app/actions/recruitment";
import { AnalyticsView } from "./analytics-view";

export default async function RecruitmentAnalyticsPage() {
  const data = await getRecruitmentAnalytics();
  return <AnalyticsView data={data} />;
}
