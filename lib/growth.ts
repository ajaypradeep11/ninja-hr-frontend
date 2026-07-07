// Continuous performance management types (mirrors backend growth.types).

export interface GoalProgressUpdate {
  id: string;
  progress: number;
  note?: string;
  at: string; // ISO datetime
}

export interface GrowthGoal {
  id: string;
  title: string;
  /** Company strategy this goal ladders up to (e.g. "Q2 Global Revenue Target"). */
  alignment?: string;
  progress: number;
  due?: string; // YYYY-MM-DD
  status: "Active" | "Completed";
  updates: GoalProgressUpdate[];
}

export interface TalkingPoint {
  id: string;
  author: string;
  text: string;
}

export interface SyncActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface OneOnOneSync {
  id: string;
  managerName: string;
  scheduledAt: string; // ISO datetime
  talkingPoints: TalkingPoint[];
  actionItems: SyncActionItem[];
}

export interface PeerFeedback {
  id: string;
  requesterName: string;
  colleagueName: string;
  colleagueId: string;
  topic: string;
  message?: string;
  status: "Pending" | "Completed";
  response?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface KudosItem {
  id: string;
  fromName?: string;
  message: string;
  emoji?: string;
  createdAt: string;
}

export interface GrowthOverview {
  goals: GrowthGoal[];
  nextSync: OneOnOneSync | null;
  feedbackSent: PeerFeedback[];
  /** Requests where the current user is the colleague being asked. */
  feedbackInbox: PeerFeedback[];
  kudos: KudosItem[];
}

export interface Colleague {
  id: string;
  name: string;
  title: string;
  department: string;
}
