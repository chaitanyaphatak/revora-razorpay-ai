import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bot, CircleAlert, Eraser, Loader2, LockKeyhole, MessageSquareText, SendHorizontal, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; sources?: string[] };

const generalQuestions = [
  "What can ReVora help me understand?",
  "How does the recovery policy stay authoritative?",
  "Does this assistant process real payments?",
];

const paymentQuestions = [
  "Why is this payment at risk?",
  "Explain the recovery probability and expected value.",
  "What does the current policy decision mean?",
];

const sourceLabel: Record<string, string> = {
  payment: "Payment context",
  recovery_policy: "Recovery policy",
  recoverai_product: "ReVora product",
};

function cleanPaymentId(value: string | null) {
  const candidate = value?.trim().toUpperCase() ?? "";
  return /^[A-Z0-9_-]{1,64}$/.test(candidate) ? candidate : "";
}

export default function MerchantAssistant() {
  const [location, setLocation] = useLocation();
  const initialPaymentId = useMemo(() => cleanPaymentId(new URLSearchParams(window.location.search).get("paymentId")), [location]);
  const [paymentId, setPaymentId] = useState(initialPaymentId);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", content: initialPaymentId ? `I can explain the approved recovery context for ${initialPaymentId}. I will not execute or change anything.` : "I can explain ReVora, recovery policy, and a selected synthetic payment. I will not execute or change anything." }]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mutation = trpc.recovery.merchantAssistant.useMutation();
  const contextual = Boolean(paymentId);
  const questions = contextual ? paymentQuestions : generalQuestions;

  useEffect(() => {
    setPaymentId(initialPaymentId);
  }, [initialPaymentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, mutation.isPending]);

  const updatePaymentContext = (nextValue: string) => {
    const nextPaymentId = cleanPaymentId(nextValue);
    setPaymentId(nextPaymentId);
    setLocation(nextPaymentId ? `/assistant?paymentId=${encodeURIComponent(nextPaymentId)}` : "/assistant");
  };

  const submit = (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? draft).trim();
    if (!content || mutation.isPending) return;
    const userMessage: ChatMessage = { id: `${Date.now()}-user`, role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    mutation.mutate({
      messages: nextMessages.slice(-6).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
      paymentId: paymentId || undefined,
    }, {
      onSuccess: result => setMessages(current => [...current, { id: `${Date.now()}-assistant`, role: "assistant", content: result.answer, sources: result.sources }]),
    });
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) submit(event);
  };

  const resetConversation = () => {
    mutation.reset();
    setMessages([{ id: "welcome", role: "assistant", content: paymentId ? `I can explain the approved recovery context for ${paymentId}. I will not execute or change anything.` : "I can explain ReVora, recovery policy, and a selected synthetic payment. I will not execute or change anything." }]);
  };

  return <div className="rr-page mx-auto max-w-7xl space-y-5 pb-10">
    <section className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/80 p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div className="max-w-2xl"><div className="flex flex-wrap items-center gap-2"><p className="rr-eyebrow">Gemini merchant assistant</p><Badge variant="outline" className="border-teal-200 bg-teal-50 text-[10px] font-bold text-teal-800"><ShieldCheck className="mr-1 h-3 w-3" />Read only</Badge></div><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">A clearer view of recovery, <span className="text-violet-600">without changing it.</span></h1><p className="mt-3 text-sm leading-6 text-slate-600">Ask practical questions about ReVora or one selected synthetic payment. Gemini explains approved context; deterministic policy remains the decision authority.</p></div><div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900 xl:max-w-sm"><LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" /><span>No real payment, recovery, reminder, policy, or database action can be performed here.</span></div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rr-surface flex min-h-[620px] flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><MessageSquareText className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-900">Merchant conversation</p><p className="text-xs text-slate-500">Grounded, concise business guidance</p></div></div><Button variant="ghost" size="sm" onClick={resetConversation} className="rounded-lg text-slate-500 hover:bg-slate-100"><Eraser className="mr-2 h-3.5 w-3.5" />Clear chat</Button></div>
        <div className="rr-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6">
          {messages.map(message => <div key={message.id} className={`rr-chat-bubble flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "rounded-tr-md bg-slate-900 text-white" : "rounded-tl-md border border-violet-100 bg-white text-slate-700"}`}><div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">{message.role === "assistant" ? <Bot className="h-3 w-3" /> : null}{message.role === "assistant" ? "ReVora" : "You"}</div><p>{message.content}</p>{message.sources?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{message.sources.map(source => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500" key={source}>{sourceLabel[source] ?? "Approved context"}</span>)}</div> : null}</div></div>)}
          {mutation.isPending ? <div className="rr-chat-bubble flex gap-3"><div className="rounded-2xl rounded-tl-md border border-violet-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"><div className="flex items-center gap-2"><span className="rr-typing-dots" aria-hidden="true"><i /><i /><i /></span>Reviewing approved context…</div></div></div> : null}
          {mutation.error ? <div className="flex gap-3"><div className="max-w-[86%] rounded-2xl rounded-tl-md border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><div className="flex items-center gap-2 font-bold"><CircleAlert className="h-4 w-4" />I could not answer that just now.</div><p className="mt-1">{mutation.error.message}</p><Button variant="link" size="sm" className="mt-1 h-auto p-0 text-amber-800" onClick={() => mutation.reset()}>Dismiss message</Button></div></div> : null}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={submit} className="border-t border-slate-100 bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><Input value={draft} onChange={event => setDraft(event.target.value.slice(0, 600))} onKeyDown={handleComposerKeyDown} disabled={mutation.isPending} maxLength={600} placeholder={contextual ? `Ask about ${paymentId}…` : "Ask about ReVora or add a payment ID…"} className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm focus-visible:ring-violet-500" /><Button type="submit" disabled={!draft.trim() || mutation.isPending} className="h-12 rounded-xl bg-violet-600 px-4 text-white hover:bg-violet-700" aria-label="Send question"><SendHorizontal className="h-4 w-4" /></Button></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400"><span>Enter to send · 600 characters maximum</span><span>Gemini answers from approved context only</span></div></form>
      </section>

      <aside className="space-y-5"><section className="rr-surface p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /><div><p className="rr-eyebrow">Context</p><h2 className="mt-1 text-lg font-semibold tracking-[-.04em] text-slate-900">Selected payment</h2></div></div><label className="mt-4 block"><span className="text-xs font-bold text-slate-600">Synthetic payment ID</span><Input value={paymentId} onChange={event => updatePaymentContext(event.target.value)} placeholder="e.g. P00272" className="mt-2 h-11 rounded-lg border-slate-200 bg-white font-mono text-sm uppercase" /></label><p className="mt-3 text-xs leading-5 text-slate-500">Leave this empty for general product questions. A selected payment adds only its approved recovery context.</p>{contextual ? <Button variant="outline" size="sm" className="mt-3 w-full rounded-lg border-violet-200 text-violet-800 hover:bg-violet-50" onClick={() => updatePaymentContext("")}>Ask without payment context</Button> : null}</section>
        <section className="rr-surface p-5"><p className="rr-eyebrow">Suggested questions</p><h2 className="mt-1 text-lg font-semibold tracking-[-.04em] text-slate-900">Start with a useful question</h2><div className="mt-4 space-y-2">{questions.map(question => <button key={question} type="button" disabled={mutation.isPending} onClick={() => submit(undefined, question)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-5 text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900 disabled:opacity-50">{question}</button>)}</div></section>
        <section className="rounded-xl border border-teal-100 bg-teal-50 p-4"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><div><p className="text-xs font-bold text-teal-900">Safety boundary</p><p className="mt-1 text-xs leading-5 text-teal-800">This assistant refuses execution requests, secret requests, and hidden-instruction requests. It does not replace operational review.</p></div></div></section>
      </aside>
    </div>
  </div>;
}
