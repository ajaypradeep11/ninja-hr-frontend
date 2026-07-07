export const dynamic = "force-dynamic";
import { getActor } from "@/lib/actor";
import { listLeaveRequests } from "@/app/actions/modules";
import LeaveView from "./leave-view";

export default async function EmployeeLeave() {
  // Real switched identity — the backend scopes the list to this actor:
  // employees get their own records, managers also get their department's.
  // Balance cards are computed INSIDE the view from these same requests, so
  // the cards and the "My Requests" table can never disagree.
  const [actor, all] = await Promise.all([getActor(), listLeaveRequests()]);

  return (
    <LeaveView
      actorName={actor.name}
      isManager={actor.roleCode === "MANAGER"}
      initialRequests={all}
    />
  );
}
