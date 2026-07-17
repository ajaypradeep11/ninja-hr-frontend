import "server-only";
import { listCases } from "@/app/actions/onboarding";
import { getLeaveRequests } from "@/lib/queries";
import { canActivate } from "@/lib/onboarding";

/** What the bell shows. `kind` picks the icon; `href` is where it gets resolved. */
export interface NotificationItem {
  id: string;
  kind: "document" | "case" | "leave";
  title: string;
  detail: string;
  href: string;
}

/**
 * What actually needs the HR admin right now, derived from live data rather
 * than stored — there is no notification table, and everything worth surfacing
 * is already a queryable state: a document nobody has verified, a case sitting
 * ready to activate, a leave request nobody has answered. Deriving keeps it
 * honest (an item disappears the moment the work is done) at the cost of no
 * read/unread memory.
 *
 * Never throws: the bell is chrome on every admin page, so a backend hiccup
 * must not take the shell down with it.
 */
export async function getAdminNotifications(): Promise<NotificationItem[]> {
  const [cases, leave] = await Promise.all([
    listCases().catch(() => []),
    getLeaveRequests().catch(() => []),
  ]);

  const items: NotificationItem[] = [];

  for (const c of cases) {
    if (c.status === "Active") continue;

    const awaiting = c.documents.filter((d) => d.status === "Needs Verification").length;
    if (awaiting > 0) {
      items.push({
        id: `doc-${c.id}`,
        kind: "document",
        title: `${awaiting} document${awaiting === 1 ? "" : "s"} to verify`,
        detail: `${c.name} · Onboarding`,
        href: `/admin/onboarding/${c.id}`,
      });
    }
    // Everything cleared and still not activated — one click from done.
    if (canActivate(c)) {
      items.push({
        id: `case-${c.id}`,
        kind: "case",
        title: "Ready to activate",
        detail: c.name,
        href: `/admin/onboarding/${c.id}`,
      });
    }
  }

  const pending = leave.filter((l) => l.status === "Pending").length;
  if (pending > 0) {
    items.push({
      id: "leave-pending",
      kind: "leave",
      title: `${pending} leave request${pending === 1 ? "" : "s"} pending`,
      detail: "Awaiting your approval",
      href: "/admin/leave",
    });
  }

  return items;
}
