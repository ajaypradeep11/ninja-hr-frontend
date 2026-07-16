import { listConversations } from "@/app/actions/assistant";
import { AssistantView } from "@/components/assistant/assistant-view";
import { getActor } from "@/lib/actor";

export default async function AdminAssistantPage() {
  const [actor, conversations] = await Promise.all([
    getActor(),
    listConversations("admin"),
  ]);
  return (
    <AssistantView
      persona="admin"
      actorName={actor.name}
      initialConversations={conversations}
    />
  );
}
