import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  Check,
  CircleAlert,
  Copy,
  CreditCard,
  Eraser,
  HelpCircle,
  MessageSquareText,
  RotateCcw,
  Search,
  SendHorizontal,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp?: string;
};

type SearchMode = "payment" | "customer" | "general";

const sourceLabel: Record<string, string> = {
  payment: "Payment Data",
  recovery_policy: "Recovery Policy",
  recoverai_product: "Product Intelligence",
  customer_profile: "Customer Profile",
};

const sourceColor: Record<string, string> = {
  payment: "bg-violet-50 text-violet-700 border-violet-200",
  recovery_policy: "bg-blue-50 text-blue-700 border-blue-200",
  recoverai_product: "bg-teal-50 text-teal-700 border-teal-200",
  customer_profile: "bg-amber-50 text-amber-700 border-amber-200",
};

const demoPayments = [
  { id: "P-98421", name: "Rahul Sharma", customerId: "C-94281", amount: 2999, reason: "UPI Timeout", probability: "88%", badge: "High Prob" },
  { id: "P-76219", name: "Priya Patel", customerId: "C-81934", amount: 4500, reason: "Insufficient Funds", probability: "76%", badge: "Promise" },
  { id: "P-54102", name: "Amit Verma", customerId: "C-44102", amount: 1499, reason: "Bank Server Down", probability: "91%", badge: "High Prob" },
  { id: "P-88324", name: "Sneha Kulkarni", customerId: "C-88324", amount: 6200, reason: "Network Drop", probability: "83%", badge: "3DS Drop" },
  { id: "P-33912", name: "Rohan Mehta", customerId: "C-33912", amount: 8999, reason: "Daily Limit", probability: "69%", badge: "High Value" },
];

const generalQuestions = [
  { text: "What is the 30-day recovery rate?", icon: TrendingUp },
  { text: "Which failure reason has the most at-risk revenue?", icon: Zap },
  { text: "How many payments are autopilot-eligible right now?", icon: Bot },
  { text: "What are the top performing recovery playbooks?", icon: Sparkles },
];

const paymentQuestions = [
  { text: "Why did this payment fail and what's the recovery probability?", icon: Zap },
  { text: "What is the recommended recovery action and why?", icon: Sparkles },
  { text: "What does the policy decision say for this payment?", icon: TrendingUp },
  { text: "Tell me about this customer's payment history.", icon: User },
  { text: "Has a voice recovery session been started for this payment?", icon: MessageSquareText },
];

const customerQuestions = [
  { text: "What payments does this customer have?", icon: CreditCard },
  { text: "What is the recovery status for this customer?", icon: TrendingUp },
  { text: "What failure reasons are most common for this customer?", icon: Zap },
];

function cleanId(value: string | null, pattern = /^[A-Z0-9_-]{1,64}$/) {
  const candidate = value?.trim().toUpperCase() ?? "";
  return pattern.test(candidate) ? candidate : "";
}

export default function MerchantAssistant() {
  const [location, setLocation] = useLocation();

  const initialPaymentId = useMemo(
    () => cleanId(new URLSearchParams(window.location.search).get("paymentId")),
    [location],
  );
  const initialCustomerId = useMemo(
    () => cleanId(new URLSearchParams(window.location.search).get("customerId")),
    [location],
  );

  const [paymentId, setPaymentId] = useState(initialPaymentId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [sidebarTab, setSidebarTab] = useState<"quick" | "search">("quick");
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeDemo = demoPayments.find(p => p.id === cleanId(paymentId));
  const activeCustomer = demoPayments.find(p => p.customerId === cleanId(customerId));

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: initialPaymentId
        ? `I have loaded payment **${initialPaymentId}**${activeDemo ? ` (${activeDemo.name}, ₹${activeDemo.amount.toLocaleString()})` : ""}. I can explain its failure diagnosis, ML recovery probability, deterministic policy recommendation, or customer history. What would you like to know?`
        : initialCustomerId
          ? `I have loaded customer **${initialCustomerId}**${activeCustomer ? ` (${activeCustomer.name})` : ""}. I can look up their full payment track record and recovery status. How can I help?`
          : "Welcome to ReVora Assistant! Ask me anything about your payments, customers, failure diagnoses, or overall recovery operations.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = trpc.recovery.merchantAssistant.useMutation();

  const currentMode: SearchMode = cleanId(paymentId) ? "payment" : cleanId(customerId) ? "customer" : "general";
  const questions = currentMode === "payment" ? paymentQuestions : currentMode === "customer" ? customerQuestions : generalQuestions;

  useEffect(() => {
    setPaymentId(initialPaymentId);
    setCustomerId(initialCustomerId);
  }, [initialPaymentId, initialCustomerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, mutation.isPending]);

  const updateContext = (nextPaymentId: string, nextCustomerId: string) => {
    const params = new URLSearchParams();
    if (nextPaymentId) params.set("paymentId", nextPaymentId);
    if (nextCustomerId) params.set("customerId", nextCustomerId);
    const qs = params.toString();
    setLocation(qs ? `/assistant?${qs}` : "/assistant");
  };

  const handleSelectPayment = (id: string) => {
    setPaymentId(id);
    setCustomerId("");
    updateContext(id, "");
    const demo = demoPayments.find(p => p.id === id);
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-system`,
        role: "assistant",
        content: `Switched context to **Payment ${id}**${demo ? ` (${demo.name} · ₹${demo.amount.toLocaleString()} · ${demo.reason})` : ""}. Ask a question below or pick a suggested topic.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleClearContext = () => {
    setPaymentId("");
    setCustomerId("");
    updateContext("", "");
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-system`,
        role: "assistant",
        content: "Cleared payment context. Now in general overview mode. You can ask about overall recovery metrics, failure trends, or search another payment/customer.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const submit = (event?: FormEvent, promptText?: string) => {
    event?.preventDefault();
    const content = (promptText ?? draft).trim();
    if (!content || mutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");

    mutation.mutate(
      {
        messages: nextMessages.slice(-8).map(({ role, content: c }) => ({ role, content: c })),
        paymentId: cleanId(paymentId) || undefined,
        customerId: (!cleanId(paymentId) && cleanId(customerId)) ? cleanId(customerId) : undefined,
      },
      {
        onSuccess: result => {
          setMessages(current => [
            ...current,
            {
              id: `${Date.now()}-assistant`,
              role: "assistant",
              content: result.answer,
              sources: result.sources,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        },
      },
    );
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) submit(event);
  };

  const resetConversation = () => {
    mutation.reset();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: paymentId
          ? `Conversation cleared. Context active for **Payment ${paymentId}**. How can I help?`
          : customerId
            ? `Conversation cleared. Context active for **Customer ${customerId}**. How can I help?`
            : "Conversation cleared. Ask me anything about payments, customers, or recovery operations.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 flex-1 flex flex-col p-3 sm:p-4 lg:p-5 gap-3 overflow-hidden bg-slate-50/60">
      {/* Top Header Bar */}
      <section className="shrink-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Intelligence Assistant ·{" "}
                <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 bg-clip-text text-transparent">
                  Gemini 2.0 Core
                </span>
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sub-Second Reasoning
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Instant explanations of payment risk, recovery probability, deterministic policy, and customer history.
            </p>
          </div>
        </div>

        {/* Active Context Chip */}
        <div className="flex items-center gap-2">
          {cleanId(paymentId) ? (
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200/80 px-3 py-1.5 text-xs text-violet-900 font-medium">
              <CreditCard className="h-3.5 w-3.5 text-violet-600" />
              <span>
                Payment: <strong className="font-mono">{cleanId(paymentId)}</strong>
                {activeDemo ? ` (${activeDemo.name} · ₹${activeDemo.amount.toLocaleString()})` : ""}
              </span>
              <button
                type="button"
                onClick={handleClearContext}
                className="ml-1 rounded-md p-0.5 text-violet-600 hover:bg-violet-200/60 hover:text-violet-900 transition-colors"
                title="Clear payment context"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : cleanId(customerId) ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-xs text-amber-900 font-medium">
              <User className="h-3.5 w-3.5 text-amber-600" />
              <span>
                Customer: <strong className="font-mono">{cleanId(customerId)}</strong>
                {activeCustomer ? ` (${activeCustomer.name})` : ""}
              </span>
              <button
                type="button"
                onClick={handleClearContext}
                className="ml-1 rounded-md p-0.5 text-amber-600 hover:bg-amber-200/60 hover:text-amber-900 transition-colors"
                title="Clear customer context"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              General Mode (All Operations)
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            className="h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 text-xs gap-1.5"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear Chat
          </Button>
        </div>
      </section>

      {/* Main Workspace Split */}
      <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Chat Panel */}
        <section className="flex flex-col rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs min-h-0">
          {/* Active Context Mini-Bar (if payment selected) */}
          {activeDemo && cleanId(paymentId) === activeDemo.id && (
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-violet-100 bg-violet-50/60 px-4 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">{activeDemo.name}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-600 font-semibold">₹{activeDemo.amount.toLocaleString()}</span>
                <span className="text-slate-400">•</span>
                <span className="text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md font-medium">
                  {activeDemo.reason}
                </span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-medium">
                  {activeDemo.probability} Recovery Propensity
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearContext}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                Switch to general
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="rr-scrollbar flex-1 min-h-0 space-y-4 overflow-y-auto bg-slate-50/40 p-4 sm:p-5">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 border border-violet-200/60 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs transition-all ${
                    message.role === "user"
                      ? "rounded-tr-xs bg-slate-900 text-white font-medium shadow-slate-900/10"
                      : "rounded-tl-xs border border-slate-200/80 bg-white text-slate-800 shadow-slate-200/50"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider opacity-60">
                    <span>{message.role === "assistant" ? "ReVora Intelligence" : "You"}</span>
                    {message.timestamp && <span className="font-normal lowercase">{message.timestamp}</span>}
                  </div>

                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>

                  {/* Sources Pills */}
                  {message.sources?.length ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400">Sources:</span>
                      {message.sources.map(source => (
                        <span
                          key={source}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${sourceColor[source] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                        >
                          {sourceLabel[source] ?? source}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Copy Button on Assistant Message */}
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                      title="Copy response"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {mutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 border border-violet-200/60 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-xs border border-violet-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-xs flex items-center gap-2.5">
                  <span className="rr-typing-dots" aria-hidden="true">
                    <i /><i /><i />
                  </span>
                  <span className="text-xs font-medium text-slate-600">Evaluating recovery context…</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {mutation.error && (
              <div className="flex gap-3 justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-xs border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                    <CircleAlert className="h-4 w-4 text-amber-700 shrink-0" />
                    Notice
                  </div>
                  <p>{mutation.error.message}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-amber-800 font-semibold"
                    onClick={() => mutation.reset()}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick Suggested Chips (Horizontally Scrollable) */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-4 py-2 flex items-center gap-2 overflow-x-auto rr-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick ask:</span>
            {questions.slice(0, 3).map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={mutation.isPending}
                onClick={() => submit(undefined, q.text)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50/80 hover:text-violet-900 transition-all disabled:opacity-50"
              >
                <q.icon className="h-3 w-3 text-violet-600" />
                <span className="truncate max-w-[200px] sm:max-w-none">{q.text}</span>
              </button>
            ))}
          </div>

          {/* Composer Form */}
          <form onSubmit={submit} className="shrink-0 border-t border-slate-200/80 bg-white p-3 sm:p-4">
            <div className="relative flex items-center">
              <Input
                ref={inputRef}
                value={draft}
                onChange={event => setDraft(event.target.value.slice(0, 600))}
                onKeyDown={handleComposerKeyDown}
                disabled={mutation.isPending}
                maxLength={600}
                placeholder={
                  cleanId(paymentId)
                    ? `Ask about payment ${cleanId(paymentId)} (e.g., failure cause, recovery probability, customer)...`
                    : cleanId(customerId)
                      ? `Ask about customer ${cleanId(customerId)}'s payment history and recovery status...`
                      : "Ask about recovery metrics, failed payments, playbooks, or customer context..."
                }
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-4 pr-12 text-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:bg-white transition-all placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!draft.trim() || mutation.isPending}
                className="absolute right-1.5 h-8 w-8 rounded-lg bg-violet-600 p-0 text-white hover:bg-violet-700 transition-transform active:scale-95 disabled:opacity-40"
                aria-label="Send message"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Press <strong>Enter ↵</strong> to send</span>
              <span>{draft.length}/600</span>
            </div>
          </form>
        </section>

        {/* Right Sidebar: Context & Actions */}
        <aside className="flex flex-col gap-3 min-h-0 overflow-y-auto rr-scrollbar">
          {/* Mode Switcher Tabs */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs shrink-0">
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3">
              <button
                type="button"
                onClick={() => setSidebarTab("quick")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  sidebarTab === "quick"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Quick Demo
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("search")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  sidebarTab === "search"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Custom Search
              </button>
            </div>

            {/* Quick Demo Payments List */}
            {sidebarTab === "quick" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1-Click Scenarios</p>
                  <span className="text-[10px] text-slate-400">Select to load context</span>
                </div>
                <div className="space-y-1.5">
                  {demoPayments.map(p => {
                    const isSelected = cleanId(paymentId) === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPayment(p.id)}
                        className={`w-full rounded-xl border p-2.5 text-left transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? "border-violet-500 bg-violet-50/80 ring-1 ring-violet-400 shadow-xs"
                            : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900">{p.id}</span>
                            <span className="text-xs text-slate-700 font-medium truncate">{p.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.reason}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-xs font-bold text-slate-900 font-mono">₹{p.amount.toLocaleString()}</span>
                          <span className="inline-block rounded-md bg-violet-100/70 text-violet-800 text-[10px] font-bold px-1.5 py-0.2">
                            {p.probability}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Custom Search Form */
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <CreditCard className="h-3.5 w-3.5 text-violet-600" />
                    Payment ID
                  </span>
                  <div className="relative">
                    <Input
                      value={paymentId}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setPaymentId(val);
                        updateContext(cleanId(val), customerId);
                      }}
                      placeholder="e.g. P-98421, P00272"
                      className="h-9 rounded-lg border-slate-200 font-mono text-xs uppercase pl-8"
                    />
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                    Customer ID
                  </span>
                  <div className="relative">
                    <Input
                      value={customerId}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setCustomerId(val);
                        updateContext(paymentId, cleanId(val));
                      }}
                      placeholder="e.g. C-94281, C001"
                      className="h-9 rounded-lg border-slate-200 font-mono text-xs uppercase pl-8"
                    />
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </label>

                {(cleanId(paymentId) || cleanId(customerId)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearContext}
                    className="w-full text-xs h-8 text-slate-600 border-slate-200 hover:bg-slate-50 gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear Filter
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* All Suggested Questions List */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs shrink-0">
            <div className="flex items-center gap-1.5 mb-2.5">
              <HelpCircle className="h-3.5 w-3.5 text-violet-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Suggested Questions</h2>
            </div>
            <div className="space-y-1.5">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => submit(undefined, q.text)}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 text-left text-xs font-medium text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-900 flex items-start gap-2 disabled:opacity-50"
                >
                  <q.icon className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{q.text}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Information & Capabilities Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Assistant Capabilities
            </h3>
            <ul className="text-[11px] text-slate-600 space-y-1 leading-normal list-disc list-inside">
              <li>Detailed failure reason breakdown & root cause</li>
              <li>Propensity scoring & expected value calculation</li>
              <li>Customer payment history & Voice AI status</li>
              <li>Read-only operation: no live financial actions</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
