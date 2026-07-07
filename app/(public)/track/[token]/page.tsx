export const dynamic = "force-dynamic";
import { getPortal } from "@/app/actions/portal";
import { TrackView } from "@/components/recruitment/track-view";

export default async function TrackApplicationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPortal(token);

  if (!view) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Application not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          This tracking link is invalid or the application data has been removed at your request.
        </p>
      </div>
    );
  }

  return <TrackView initial={view} token={token} />;
}
