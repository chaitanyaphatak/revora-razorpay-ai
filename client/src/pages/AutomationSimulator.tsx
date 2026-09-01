import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { Button } from "@/components/ui/button";
import { EnvironmentStrip } from "@/components/recoverai/DesignPrimitives";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Activity, Bot, CheckCircle2, ChevronRight, CircleAlert, Clock3, Copy, ListChecks, LoaderCircle, PauseCircle, PlayCircle, Plus, Settings2, ShieldCheck, Sparkles, Trash2, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const automationStorageKey = "revora:automation-simulator:v1";
const runStorageKey = "revora:automation-runs:v1";

const triggerOptions = [
  { value: "payment_failed", label: "Payment failed" },
  { value: "payment_overdue", label: "Payment overdue" },
  { value: "payment_at_risk", label: "Payment at risk" },
] as const;
const primaryActionOptions = [
  { value: "retry_payment", label: "Smart retry" },
  { value: "send_recovery_reminder", label: "Send recovery reminder (simulated)" },
  { value: "suggest_alternate_payment", label: "Suggest alternate payment (simulated)" },
  { value: "escalate_to_human", label: "Escalate recovery" },
  { value: "do_nothing", label: "End workflow" },
] as const;
const followUpOptions = [
  { value: "send_recovery_reminder", label: "Send reminder if unrecovered (simulated)" },
  { value: "escalate_to_human", label: "Escalate if unrecovered" },
  { value: "end_workflow", label: "End workflow" },
] as const;

type AutomationTrigger = (typeof triggerOptions)[number]["value"];
type RecoveryAction = (typeof primaryActionOptions)[number]["value"];
type FollowUpAction = (typeof followUpOptions)[number]["value"];
type CustomerSegment = "any" | "new" | "returning";

type AutomationDefinition = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  minimumAmount: number;
  failureReason: "any" | "gateway_timeout" | "upi_timeout" | "network_error" | "issuer_declined" | "insufficient_funds" | "invalid_card";
  customerSegment: CustomerSegment;
  minimumPreviousFailures: number;
  action: RecoveryAction;
  waitHours: number;
  followUp: FollowUpAction;
  createdAt: string;
};

type AutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  paymentId: string;
  action: RecoveryAction;
  status: "recovered" | "failed" | "exhausted" | "blocked" | "escalated" | "skipped";
  amountRecovered: number;
  simulatedDurationSeconds: number;
  message: string;
  completedAt: string;
};

const starterAutomation: AutomationDefinition = {
  id: "auto_failed_payment_recovery",
  name: "Failed payment recovery",
  enabled: true,
  trigger: "payment_failed",
  minimumAmount: 0,
  failureReason: "any",
  customerSegment: "any",
  minimumPreviousFailures: 0,
  action: "retry_payment",
  waitHours: 6,
  followUp: "send_recovery_reminder",
  createdAt: "2026-08-27T00:00:00.000Z",
};

const newAutomation = (): AutomationDefinition => ({
  ...starterAutomation,
  id: `auto_${Date.now().toString(36)}`,
  name: "New recovery workflow",
  createdAt: new Date().toISOString(),
});

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function pause(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

function actionLabel(action: RecoveryAction) {
  return primaryActionOptions.find(option => option.value === action)?.label ?? humanize(action);
}

function statusStyle(status: AutomationRun["status"]) {
  const styles = {
    recovered: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
    exhausted: "bg-amber-50 text-amber-800",
    blocked: "bg-amber-50 text-amber-800",
    escalated: "bg-violet-50 text-violet-700",
    skipped: "bg-slate-100 text-slate-600",
  } as const;
  return styles[status];
}

function triggerLabel(trigger: AutomationTrigger) {
  return triggerOptions.find(option => option.value === trigger)?.label ?? humanize(trigger);
}

export default function AutomationSimulator() {
  const [automations, setAutomations] = useState<AutomationDefinition[]>(() => readStored(automationStorageKey, [starterAutomation]));
  const [runs, setRuns] = useState<AutomationRun[]>(() => readStored(runStorageKey, []));
  const [selectedPaymentId, setSelectedPaymentId] = useState("P04961");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [activeRun, setActiveRun] = useState<{ automationId: string; step: number; sourceType: "payment" | "invoice" } | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<AutomationDefinition | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [recommendationState, setRecommendationState] = useState<"idle" | "loading" | "success">("idle");
  const payments = trpc.recovery.payments.useQuery({ page: 1, pageSize: 50, status: "FAILED", sort: "probability_desc" });
  const invoices = trpc.invoices.list.useQuery({ page: 1, pageSize: 50, overdueOnly: true });
  const utils = trpc.useUtils();
  const simulation = trpc.recovery.automationSimulate.useMutation();
  const invoiceSimulation = trpc.recovery.automationInvoiceSimulate.useMutation();
  const aiRecommendation = trpc.recovery.merchantAssistant.useMutation();

  useEffect(() => { window.localStorage.setItem(automationStorageKey, JSON.stringify(automations)); }, [automations]);
  useEffect(() => { window.localStorage.setItem(runStorageKey, JSON.stringify(runs.slice(0, 50))); }, [runs]);
  useEffect(() => {
    if (payments.data?.payments.length && !payments.data.payments.some(payment => payment.id === selectedPaymentId)) setSelectedPaymentId(payments.data.payments[0]!.id);
  }, [payments.data, selectedPaymentId]);
  useEffect(() => {
    if (invoices.data?.invoices.length && !invoices.data.invoices.some(invoice => invoice.id === selectedInvoiceId)) setSelectedInvoiceId(invoices.data.invoices[0]!.id);
  }, [invoices.data, selectedInvoiceId]);

  const selectedPayment = payments.data?.payments.find(payment => payment.id === selectedPaymentId) ?? null;
  const selectedInvoice = invoices.data?.invoices.find(invoice => invoice.id === selectedInvoiceId) ?? null;
  const visibleRuns = showAllHistory ? runs : runs.slice(0, 6);
  const metrics = useMemo(() => ({
    active: automations.filter(automation => automation.enabled).length,
    executions: runs.length,
    attempts: runs.filter(run => run.action !== "do_nothing").length,
    recovered: runs.reduce((total, run) => total + run.amountRecovered, 0),
    successRate: runs.length ? runs.filter(run => run.status === "recovered").length / runs.length : 0,
  }), [automations, runs]);

  const saveAutomation = () => {
    if (!editingAutomation) return;
    const name = editingAutomation.name.trim();
    if (name.length < 2) {
      toast.error("Name the automation before saving.");
      return;
    }
    const prepared = { ...editingAutomation, name };
    setAutomations(current => current.some(automation => automation.id === prepared.id) ? current.map(automation => automation.id === prepared.id ? prepared : automation) : [prepared, ...current]);
    setEditorOpen(false);
    setEditingAutomation(null);
    toast.success("Automation saved locally", { description: "This public demo stores workflow configuration only in this browser." });
  };

  const updateAutomation = (id: string, change: Partial<AutomationDefinition>) => setAutomations(current => current.map(automation => automation.id === id ? { ...automation, ...change } : automation));
  const duplicateAutomation = (automation: AutomationDefinition) => {
    const duplicate = { ...automation, id: `auto_${Date.now().toString(36)}`, name: `${automation.name} copy`, enabled: false, createdAt: new Date().toISOString() };
    setAutomations(current => [duplicate, ...current]);
    toast.success("Automation duplicated", { description: "The copied workflow starts paused." });
  };
  const deleteAutomation = (automation: AutomationDefinition) => {
    if (!window.confirm(`Delete “${automation.name}”? Its local execution history will remain visible.`)) return;
    setAutomations(current => current.filter(item => item.id !== automation.id));
    toast.success("Automation deleted");
  };

  const conditionMismatch = (automation: AutomationDefinition) => {
    if (automation.trigger === "payment_overdue") {
      if (!selectedInvoice) return "Select a valid overdue invoice before running this receivables simulation.";
      if (selectedInvoice.daysOverdue < 1) return "This selected invoice is not overdue.";
      if (selectedInvoice.outstandingAmount < automation.minimumAmount) return `The invoice is below the ${currency.format(automation.minimumAmount)} workflow amount condition.`;
      return null;
    }
    if (!selectedPayment) return "Select a valid failed payment before running a simulation.";
    if (automation.trigger === "payment_at_risk" && selectedPayment.recoveryProbability >= 0.5) return "This selected payment is not in the low-confidence at-risk segment.";
    if (selectedPayment.amount < automation.minimumAmount) return `The payment is below the ${currency.format(automation.minimumAmount)} workflow amount condition.`;
    if (automation.failureReason !== "any" && selectedPayment.failureReason !== automation.failureReason) return "The selected payment does not match this workflow’s failure-reason condition.";
    const segment = selectedPayment.customerTenure === null ? "any" : selectedPayment.customerTenure >= 365 ? "returning" : "new";
    if (automation.customerSegment !== "any" && segment !== automation.customerSegment) return "The selected payment does not match this workflow’s customer-segment condition.";
    if (selectedPayment.previousFailures < automation.minimumPreviousFailures) return "The selected payment does not meet this workflow’s failed-attempt condition.";
    return null;
  };

  const runAutomation = async (automation: AutomationDefinition) => {
    if (!automation.enabled) {
      toast.message("Automation is paused", { description: "Enable this workflow before testing its simulated run." });
      return;
    }
    const mismatch = conditionMismatch(automation);
    if (mismatch) {
      toast.error("Workflow conditions are not met", { description: mismatch });
      return;
    }

    const isInvoiceWorkflow = automation.trigger === "payment_overdue";
    const visualSteps = isInvoiceWorkflow ? ["Overdue invoice detected", "Analyzing receivables recovery conditions…", "Recovery strategy selected", "Preparing simulated receivables follow-up…", "Running simulated receivables workflow…", "Recording synthetic receivables audit evidence…"] : ["Payment failure detected", "Analyzing recovery conditions…", "Recovery strategy selected", "Preparing simulated recovery notification…", "Running simulated recovery action…", "Recording synthetic audit evidence…"];
    setActiveRun({ automationId: automation.id, step: 0, sourceType: isInvoiceWorkflow ? "invoice" : "payment" });
    try {
      const execution = isInvoiceWorkflow
        ? invoiceSimulation.mutateAsync({ automationId: automation.id, automationName: automation.name, invoiceId: selectedInvoiceId, action: automation.action })
        : simulation.mutateAsync({ automationId: automation.id, automationName: automation.name, paymentId: selectedPaymentId, action: automation.action });
      for (let step = 0; step < visualSteps.length; step += 1) {
        setActiveRun({ automationId: automation.id, step, sourceType: isInvoiceWorkflow ? "invoice" : "payment" });
        await pause(420);
      }
      const response = await execution;
      const result = response.automation;
      const run: AutomationRun = {
        id: `run_${Date.now().toString(36)}`,
        automationId: automation.id,
        automationName: automation.name,
        paymentId: isInvoiceWorkflow ? selectedInvoiceId : selectedPaymentId,
        action: automation.action,
        status: result.resultState,
        amountRecovered: result.simulation.amountRecovered,
        simulatedDurationSeconds: result.simulatedDurationSeconds,
        message: result.simulation.message,
        completedAt: new Date().toISOString(),
      };
      setRuns(current => [run, ...current]);
      toast.success(result.resultState === "recovered" ? "Simulated recovery completed" : "Simulated recovery recorded", { description: result.simulation.message });
      if (isInvoiceWorkflow) {
        void utils.invoices.dashboard.invalidate();
        void utils.invoices.list.invalidate();
        void utils.invoices.detail.invalidate({ invoiceId: selectedInvoiceId });
      } else {
        void utils.recovery.dashboard.invalidate();
        void utils.recovery.operationsCenter.invalidate();
        void utils.recovery.paymentDetail.invalidate({ paymentId: selectedPaymentId });
        void utils.recovery.policyDecisions.invalidate({ paymentId: selectedPaymentId });
      }
    } catch (error) {
      toast.error("Automation simulation was not recorded", { description: error instanceof Error ? error.message : "Please retry the simulation." });
    } finally {
      setActiveRun(null);
    }
  };

  const applyRecommendation = () => {
    if (recommendationState !== "idle") return;
    setRecommendationState("loading");
    const target = automations[0];
    const recommended: Partial<AutomationDefinition> = { trigger: "payment_failed", failureReason: "gateway_timeout", action: "retry_payment", waitHours: 6, followUp: "send_recovery_reminder", minimumPreviousFailures: 0 };
    window.setTimeout(() => {
      if (target) updateAutomation(target.id, recommended);
      else setAutomations([{ ...starterAutomation, ...recommended }]);
      setRecommendationState("success");
      toast.success("Recommendation applied", { description: "The fixed simulation template is configured as Wait 6 hours → Smart retry → Reminder if unrecovered." });
      window.setTimeout(() => setRecommendationState("idle"), 1_200);
    }, 220);
  };

  const requestAiRecommendation = () => {
    if (!selectedPayment) {
      toast.error("Select a valid payment before requesting an explanation.");
      return;
    }
    aiRecommendation.mutate({ paymentId: selectedPayment.id, messages: [{ role: "user", content: "Explain the deterministic policy-supported recovery workflow for this selected payment. Keep this read-only and do not initiate any action." }] });
  };

  const paymentSteps = ["Payment failure detected", "Analyzing recovery conditions…", "Recovery strategy selected", "Preparing simulated recovery notification…", "Running simulated recovery action…", "Recording synthetic audit evidence…"];
  const invoiceSteps = ["Overdue invoice detected", "Analyzing receivables recovery conditions…", "Recovery strategy selected", "Preparing simulated receivables follow-up…", "Running simulated receivables workflow…", "Recording synthetic receivables audit evidence…"];

  return <div className="rr-page mx-auto max-w-7xl space-y-5 pb-10">
    <section className="rr-command-hero relative overflow-hidden px-6 py-7 sm:px-8">
      <div className="rr-command-signal" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="rr-eyebrow text-teal-700">Recovery Automation Studio</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.05em] text-slate-950">Configure, test, and measure <span className="text-teal-600">simulated recovery workflows.</span></h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Build a policy-bound workflow, watch an explicit synthetic run, and review its local execution history. No payment provider, customer message, or external collection action is contacted.</p></div>
        <Button onClick={() => { setEditingAutomation(newAutomation()); setEditorOpen(true); }} className="self-start rounded-lg bg-slate-900 text-white hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" />Create automation</Button>
      </div>
    </section>

    <section className="rr-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Active Automations" value={metrics.active.toLocaleString("en-IN")} icon={Workflow} tone="teal" />
      <MetricCard label="Simulated Executions" value={metrics.executions.toLocaleString("en-IN")} icon={Activity} tone="blue" />
      <MetricCard label="Recovery Attempts" value={metrics.attempts.toLocaleString("en-IN")} icon={PlayCircle} tone="violet" />
      <MetricCard label="Simulated Revenue Recovered" value={currency.format(metrics.recovered)} icon={CheckCircle2} tone="green" />
      <MetricCard label="Recovery Success Rate" value={`${Math.round(metrics.successRate * 100)}%`} icon={Sparkles} tone="amber" />
    </section>

    <section className="rr-surface p-5 sm:p-6">
      <div><p className="rr-eyebrow">Test target</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-900">Choose a source record for a simulated run</h2><p className="mt-1 text-xs leading-5 text-slate-500">Source records remain unchanged. Payment workflows use failed payments; overdue workflows use source-backed B2B invoices.</p></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><label className="min-w-0"><span className="text-xs font-bold text-slate-600">Payment workflow source</span><select value={selectedPaymentId} disabled={Boolean(activeRun)} onChange={event => setSelectedPaymentId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">{payments.isLoading ? <option>Loading source payments…</option> : payments.data?.payments.map(payment => <option key={payment.id} value={payment.id}>{payment.id} · {currency.format(payment.amount)} · {humanize(payment.failureReason ?? "unknown")}</option>)}</select></label><label className="min-w-0"><span className="text-xs font-bold text-slate-600">Overdue workflow source</span><select value={selectedInvoiceId} disabled={Boolean(activeRun) || invoices.data?.setupRequired} onChange={event => setSelectedInvoiceId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">{invoices.isLoading ? <option>Loading overdue invoices…</option> : invoices.data?.invoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.id} · {currency.format(invoice.outstandingAmount)} · {invoice.daysOverdue} days overdue</option>)}</select></label></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">{selectedPayment ? <><InfoCell label="Payment amount" value={currency.format(selectedPayment.amount)} /><InfoCell label="Failure signal" value={humanize(selectedPayment.failureReason ?? "unknown")} /><InfoCell label="Recovery probability" value={`${Math.round(selectedPayment.recoveryProbability * 100)}%`} /><InfoCell label="Previous failures" value={selectedPayment.previousFailures.toLocaleString("en-IN")} /></> : null}{selectedInvoice ? <><InfoCell label="Invoice outstanding" value={currency.format(selectedInvoice.outstandingAmount)} /><InfoCell label="Invoice overdue" value={`${selectedInvoice.daysOverdue} days`} /><InfoCell label="Invoice probability" value={`${Math.round(selectedInvoice.recoveryProbability * 100)}%`} /><InfoCell label="Invoice risk" value={humanize(selectedInvoice.recoveryRisk)} /></> : null}</div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Active workflows</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-900">Automation library</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Stored in this browser</span></div>
        {automations.length ? automations.map(automation => <AutomationCard key={automation.id} automation={automation} running={activeRun?.automationId === automation.id} activeStep={activeRun?.automationId === automation.id ? activeRun.step : null} steps={activeRun?.automationId === automation.id && activeRun.sourceType === "invoice" ? invoiceSteps : paymentSteps} onRun={() => void runAutomation(automation)} onToggle={() => updateAutomation(automation.id, { enabled: !automation.enabled })} onEdit={() => { setEditingAutomation(automation); setEditorOpen(true); }} onDuplicate={() => duplicateAutomation(automation)} onDelete={() => deleteAutomation(automation)} onViewHistory={() => document.getElementById("execution-history")?.scrollIntoView({ behavior: "smooth", block: "start" })} />) : <div className="rr-surface p-8 text-center"><Workflow className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No automations in this browser</p><Button onClick={() => { setEditingAutomation(newAutomation()); setEditorOpen(true); }} variant="outline" className="mt-4 rounded-lg">Create an automation</Button></div>}
      </div>

      <div className="space-y-5">
        <section className="rr-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="rr-eyebrow">AI Recovery Recommendation</p><h2 className="mt-1 text-lg font-semibold tracking-[-.04em] text-slate-900">Policy-supported smart-retry template</h2></div><Bot className="h-5 w-5 text-violet-600" /></div><p className="mt-4 text-sm leading-6 text-slate-600">Timeout-style payment failures can be tested with a measured delay before a policy-approved Smart Retry, followed by a simulated reminder only when the run does not recover.</p><div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Recommended workflow</p><p className="rr-workflow-flow mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-violet-950"><span>Wait 6 hours</span><ChevronRight className="h-3.5 w-3.5" /><span>Smart Retry</span><ChevronRight className="h-3.5 w-3.5" /><span>Simulated reminder if unrecovered</span></p></div>{aiRecommendation.data ? <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4"><p className="text-xs font-bold text-teal-900">Gemini explanation</p><p className="mt-2 text-xs leading-5 text-teal-800">{aiRecommendation.data.answer}</p><p className="mt-2 text-[10px] text-teal-700">{aiRecommendation.data.safetyNotice}</p></div> : null}<div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={applyRecommendation} disabled={Boolean(activeRun) || recommendationState === "loading"} className="rounded-lg bg-violet-600 text-white hover:bg-violet-700">{recommendationState === "loading" ? <><LoaderCircle className="rr-execution-spinner mr-2 h-4 w-4" />Applying…</> : recommendationState === "success" ? <><CheckCircle2 className="rr-execution-check mr-2 h-4 w-4" />Applied</> : <><Sparkles className="mr-2 h-4 w-4" />Apply recommendation</>}</Button><Button onClick={requestAiRecommendation} disabled={aiRecommendation.isPending || Boolean(activeRun) || !selectedPayment} variant="outline" className="rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50">{aiRecommendation.isPending ? <LoaderCircle className="rr-execution-spinner mr-2 h-4 w-4" /> : <Bot className="mr-2 h-4 w-4" />}Explain with Gemini</Button></div><p className="mt-3 text-[11px] leading-5 text-slate-500">Gemini explains source-derived context only. The deterministic policy remains the authority for every simulated run.</p></section>
        <section className="rr-surface p-5 sm:p-6"><p className="rr-eyebrow">Safety boundary</p><h2 className="mt-1 text-lg font-semibold tracking-[-.04em] text-slate-900">What a test run can and cannot do</h2><div className="mt-4 space-y-3 text-xs leading-5"><p className="rounded-lg bg-emerald-50 p-3 text-emerald-800"><strong>It can:</strong> validate policy, calculate a deterministic synthetic outcome, add labelled simulation evidence, and update the Automation page’s local run metrics.</p><p className="rounded-lg bg-rose-50 p-3 text-rose-800"><strong>It cannot:</strong> invoke a gateway, alter a source payment, send customer communication, process a real retry, or collect funds.</p></div></section>
      </div>
    </section>

    <section id="execution-history" className="rr-surface p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="rr-eyebrow">Execution history</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-900">Simulated automation activity</h2><p className="mt-1 text-xs leading-5 text-slate-500">The activity below is retained locally in this browser and links each run to its policy-governed synthetic result.</p></div>{runs.length > 6 ? <Button onClick={() => setShowAllHistory(value => !value)} variant="outline" size="sm" className="rounded-lg">{showAllHistory ? "Show latest 6" : `View all ${runs.length} runs`}</Button> : null}</div>{visibleRuns.length ? <div className="mt-5 divide-y divide-slate-100">{visibleRuns.map(run => <article key={run.id} className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto]"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${run.status === "recovered" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{run.status === "recovered" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-800">{run.automationName}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle(run.status)}`}>{humanize(run.status)}</span></div><p className="mt-1 text-xs text-slate-500"><span className="font-mono">{run.paymentId}</span> <ChevronRight className="inline h-3 w-3" /> {actionLabel(run.action)} <ChevronRight className="inline h-3 w-3" /> {run.amountRecovered > 0 ? `Recovered ${currency.format(run.amountRecovered)} (simulated)` : "No simulated recovery amount"}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{run.message}</p></div><div className="text-left sm:text-right"><p className="text-xs font-semibold text-slate-700">{time.format(new Date(run.completedAt))}</p><p className="mt-1 text-[10px] text-slate-500">{run.simulatedDurationSeconds}s simulated duration</p></div></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center"><ListChecks className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No simulated runs yet</p><p className="mt-1 text-xs text-slate-500">Run an enabled automation against a matching source payment to build execution history and recovery metrics.</p></div>}</section>

    <Dialog open={editorOpen} onOpenChange={open => { setEditorOpen(open); if (!open) setEditingAutomation(null); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{automations.some(automation => automation.id === editingAutomation?.id) ? "Edit automation" : "Create automation"}</DialogTitle><DialogDescription>Configure a browser-local workflow. Source records and fixed policy limits are never edited here.</DialogDescription></DialogHeader>{editingAutomation ? <div className="space-y-5"><label className="block"><span className="text-xs font-bold text-slate-600">Automation name</span><Input value={editingAutomation.name} maxLength={80} onChange={event => setEditingAutomation(current => current ? { ...current, name: event.target.value } : current)} className="mt-2 h-11 rounded-lg" /></label><div className="grid gap-4 sm:grid-cols-2"><FieldSelect label="Trigger" value={editingAutomation.trigger} onChange={value => setEditingAutomation(current => current ? { ...current, trigger: value as AutomationTrigger } : current)} options={triggerOptions} /><FieldSelect label="Primary action" value={editingAutomation.action} onChange={value => setEditingAutomation(current => current ? { ...current, action: value as RecoveryAction } : current)} options={primaryActionOptions} /><FieldSelect label="Failure reason condition" value={editingAutomation.failureReason} onChange={value => setEditingAutomation(current => current ? { ...current, failureReason: value as AutomationDefinition["failureReason"] } : current)} options={[{ value: "any", label: "Any failure reason" }, ...triggerOptions.length ? [{ value: "gateway_timeout", label: "Gateway timeout" }, { value: "upi_timeout", label: "UPI timeout" }, { value: "network_error", label: "Network error" }, { value: "issuer_declined", label: "Issuer declined" }, { value: "insufficient_funds", label: "Insufficient funds" }, { value: "invalid_card", label: "Invalid card" }] : []]} /><FieldSelect label="Customer segment" value={editingAutomation.customerSegment} onChange={value => setEditingAutomation(current => current ? { ...current, customerSegment: value as CustomerSegment } : current)} options={[{ value: "any", label: "Any source customer" }, { value: "new", label: "New customer" }, { value: "returning", label: "Returning customer" }]} /><NumberField label="Minimum payment amount" value={editingAutomation.minimumAmount} min={0} max={1000000} onChange={value => setEditingAutomation(current => current ? { ...current, minimumAmount: value } : current)} /><NumberField label="Minimum previous failures" value={editingAutomation.minimumPreviousFailures} min={0} max={10} onChange={value => setEditingAutomation(current => current ? { ...current, minimumPreviousFailures: value } : current)} /><NumberField label="Wait before primary action (hours)" value={editingAutomation.waitHours} min={0} max={72} onChange={value => setEditingAutomation(current => current ? { ...current, waitHours: value } : current)} /><FieldSelect label="If unrecovered" value={editingAutomation.followUp} onChange={value => setEditingAutomation(current => current ? { ...current, followUp: value as FollowUpAction } : current)} options={followUpOptions} /></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="rr-eyebrow">Workflow preview</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700"><WorkflowNode>{triggerLabel(editingAutomation.trigger)}</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>Conditions</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>{actionLabel(editingAutomation.action)}</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>Wait {editingAutomation.waitHours}h</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>{followUpOptions.find(option => option.value === editingAutomation.followUp)?.label}</WorkflowNode></div></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Simulation transparency:</strong> this workflow can be configured and tested, but it cannot trigger a real payment retry or customer communication. A successful test records only labelled synthetic evidence.</div></div> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button type="button" onClick={saveAutomation} className="bg-slate-900 text-white hover:bg-slate-800">Save automation</Button></DialogFooter></DialogContent>
    </Dialog>
  </div>;
}

function AutomationCard({ automation, running, activeStep, steps, onRun, onToggle, onEdit, onDuplicate, onDelete, onViewHistory }: { automation: AutomationDefinition; running: boolean; activeStep: number | null; steps: string[]; onRun: () => void; onToggle: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onViewHistory: () => void }) {
  return <article className="rr-surface overflow-hidden"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-slate-900">{automation.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${automation.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{automation.enabled ? "Enabled" : "Paused"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{triggerLabel(automation.trigger)} · {automation.failureReason === "any" ? "any failure reason" : humanize(automation.failureReason)} · {automation.minimumPreviousFailures}+ previous failures</p></div><div className="flex flex-wrap gap-2"><Button onClick={onToggle} disabled={running} size="sm" variant="outline" className="rounded-lg">{automation.enabled ? <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}{automation.enabled ? "Disable" : "Enable"}</Button><Button onClick={onEdit} disabled={running} size="sm" variant="outline" className="rounded-lg"><Settings2 className="mr-1.5 h-3.5 w-3.5" />Edit</Button></div></div><div className="border-y border-slate-100 bg-slate-50 px-5 py-4"><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600"><WorkflowNode>{triggerLabel(automation.trigger)}</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>Conditions</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>{actionLabel(automation.action)}</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>Wait {automation.waitHours}h</WorkflowNode><ChevronRight className="h-3.5 w-3.5 text-slate-400" /><WorkflowNode>{followUpOptions.find(option => option.value === automation.followUp)?.label}</WorkflowNode></div></div>{running && activeStep !== null ? <div className="border-b border-violet-100 bg-violet-50 px-5 py-4" aria-live="polite"><div className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin text-violet-600" /><p className="text-xs font-bold text-violet-900">Simulation in progress</p></div><ol className="mt-3 space-y-2">{steps.map((step, index) => <li key={step} className={`flex items-center gap-2 text-xs ${index <= activeStep ? "text-violet-900" : "text-violet-300"}`}><span className={`h-2 w-2 rounded-full ${index < activeStep ? "bg-emerald-500" : index === activeStep ? "bg-violet-600 animate-pulse" : "bg-violet-200"}`} />{step}</li>)}</ol><p className="mt-3 text-[11px] text-violet-700">No payment provider or communication channel is contacted during this simulation.</p></div> : null}<div className="flex flex-wrap items-center gap-2 p-4"><Button onClick={onRun} disabled={running} className="rounded-lg bg-[#5235bb] text-white hover:bg-[#432a9a]">{running ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}{running ? "Running simulation…" : "Run test"}</Button><Button onClick={onViewHistory} disabled={running} size="sm" variant="ghost" className="rounded-lg text-slate-600"><Clock3 className="mr-1.5 h-3.5 w-3.5" />View history</Button><Button onClick={onDuplicate} disabled={running} size="sm" variant="ghost" className="rounded-lg text-slate-600"><Copy className="mr-1.5 h-3.5 w-3.5" />Duplicate</Button><Button onClick={onDelete} disabled={running} size="sm" variant="ghost" className="ml-auto rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button></div></article>;
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Workflow; tone: "teal" | "blue" | "violet" | "green" | "amber" }) { const tones = { teal: "bg-teal-50 text-teal-600", blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" }; return <article className="rr-kpi"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-xl font-semibold tracking-[-.04em] text-slate-950">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></article>; }
function InfoCell({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>; }
function WorkflowNode({ children }: { children: React.ReactNode }) { return <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700">{children}</span>; }
function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) { return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><Input type="number" min={min} max={max} value={value} onChange={event => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} className="mt-2 h-11 rounded-lg" /></label>; }
