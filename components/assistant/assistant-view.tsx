"use client";

import * as React from "react";
import { Menu, MessageSquareHeart, Plus, Send, ShieldAlert, Sparkles, Trash2, X } from "lucide-react";
import { Avatar, Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  createConversation,
  deleteConversation,
  sendChatMessage,
  type ChatMessageView,
  type ConversationView,
} from "@/app/actions/assistant";
import { AssistantMarkdown } from "./assistant-markdown";

interface AssistantViewProps {
  persona: "admin" | "employee";
  actorName: string;
  initialConversations: ConversationView[];
}

export function AssistantView({ persona, actorName, initialConversations }: AssistantViewProps) {
  const [conversations, setConversations] = React.useState(initialConversations);
  const [selectedId, setSelectedId] = React.useState(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mobileList, setMobileList] = React.useState(false);
  const threadRef = React.useRef<HTMLDivElement>(null);
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  React.useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [selected?.messages.length, pending]);

  async function newChat() {
    if (pending) return;
    setError(null);
    try {
      const conversation = await createConversation(persona);
      setConversations((current) => [conversation, ...current]);
      setSelectedId(conversation.id);
      setMobileList(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a conversation.");
    }
  }

  async function removeConversation(id: string) {
    if (pending) return;
    setError(null);
    try {
      const remaining = await deleteConversation(id, persona);
      setConversations(remaining);
      setSelectedId((current) => (current === id ? remaining[0]?.id ?? null : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the conversation.");
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || pending) return;
    setError(null);
    setPending(true);
    let conversation = selected;
    try {
      if (!conversation) {
        conversation = await createConversation(persona);
        setSelectedId(conversation.id);
        setConversations((current) => [conversation as ConversationView, ...current]);
      }
      const optimistic: ChatMessageView = {
        id: "optimistic-pending-message",
        role: "user",
        content,
        blockedCategory: null,
        createdAt: "",
      };
      const conversationId = conversation.id;
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, optimistic] } : item));
      setDraft("");
      const updated = await sendChatMessage(conversationId, content, persona);
      setConversations((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
    } catch (cause) {
      setDraft(content);
      setError(cause instanceof Error ? cause.message : "Message failed. Your draft is ready to retry.");
      if (conversation) {
        setConversations((current) => current.map((item) => item.id === conversation?.id ? { ...item, messages: item.messages.filter((message) => !message.id.startsWith("optimistic-")) } : item));
      }
    } finally {
      setPending(false);
    }
  }

  const conversationList = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line p-3">
        <span className="text-sm font-semibold text-ink">Conversations</span>
        <button className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas lg:hidden" onClick={() => setMobileList(false)} aria-label="Close conversations"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <div key={conversation.id} className={cn("group flex items-center rounded-xl", selectedId === conversation.id ? "bg-brand-50 text-brand-700" : "hover:bg-canvas")}>
            <button className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm" onClick={() => { setSelectedId(conversation.id); setMobileList(false); }}>{conversation.title}</button>
            <button className="mr-1 rounded-lg p-2 text-ink-faint opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100" onClick={() => removeConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3"><Button className="w-full" variant="outline" onClick={newChat}><Plus className="h-4 w-4" />New chat</Button></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white"><MessageSquareHeart className="h-5 w-5" /></span><div><h1 className="text-2xl font-bold tracking-tight text-ink">HR Assistant</h1><p className="text-sm text-ink-muted">Private, grounded help for your workplace questions</p></div></div>
        <Button className="lg:hidden" variant="outline" onClick={() => setMobileList(true)}><Menu className="h-4 w-4" />Chats</Button>
      </div>
      <Card className="relative flex h-[70vh] min-h-[520px] overflow-hidden p-0">
        <aside className="hidden w-64 shrink-0 border-r border-line lg:block">{conversationList}</aside>
        {mobileList ? <div className="absolute inset-0 z-20 w-72 max-w-[85%] border-r border-line bg-card shadow-xl lg:hidden">{conversationList}</div> : null}
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={threadRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!selected || selected.messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center px-6 text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles className="h-5 w-5" /></span><h2 className="font-semibold text-ink">How can I help?</h2><p className="mt-1 max-w-sm text-sm text-ink-muted">Ask about leave, workplace policies, onboarding, or another HR topic.</p></div> : <div className="mx-auto max-w-3xl space-y-5">{selected.messages.map((message) => <div key={message.id} className={cn("flex items-start gap-2.5", message.role === "user" && "flex-row-reverse")}>
              {message.role === "user" ? <Avatar name={actorName} size={32} /> : <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", message.blockedCategory ? "bg-amber-100 text-amber-700" : "bg-brand-500 text-white")}>{message.blockedCategory ? <ShieldAlert className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}</span>}
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", message.role === "user" ? "bg-brand-500 text-white" : message.blockedCategory ? "border border-amber-200 bg-amber-50 text-amber-950" : "bg-canvas text-ink-soft")}>
                {message.role === "assistant" ? <AssistantMarkdown>{message.content}</AssistantMarkdown> : <p className="whitespace-pre-wrap">{message.content}</p>}
              </div></div>)}{pending ? <div className="flex items-center gap-2 text-sm text-ink-muted"><Sparkles className="h-4 w-4 animate-pulse text-brand-500" />Thinking…</div> : null}</div>}
          </div>
          <div className="border-t border-line p-3 sm:p-4">
            <div className="mx-auto max-w-3xl"><div className="flex items-end gap-2 rounded-2xl border border-line bg-card p-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} maxLength={4000} disabled={pending} placeholder="Ask an HR or workplace question…" className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-ink-faint" /><button onClick={send} disabled={pending || !draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button></div>{error ? <p className="mt-2 text-sm text-red-600" role="alert">{error} Retry when ready.</p> : null}</div>
          </div>
        </section>
      </Card>
      {persona === "employee" ? <p className="mt-3 text-center text-xs text-ink-faint">The assistant is scoped to your own records only and cannot view another employee’s data.</p> : null}
    </div>
  );
}
