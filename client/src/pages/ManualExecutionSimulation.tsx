import { humanize, StatusPill } from "@/components/recoverai/StatusPill";
import { EnvironmentStrip } from "@/components/recoverai/DesignPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, CircleAlert, ClipboardCheck, LoaderCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const actions = ["retry_payment", "send_recovery_reminder", "suggest_alternate_payment", "escalate_to_human", "do_nothing"] as const;
type RecoveryAction = (typeof actions)[number];
type ManualOutcome = "recovered" | "not_recovered" | "escalated" | "skipped";
const minimumProcessingFeedbackMs = 650;
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const outcomesFor = (action: RecoveryAction): Array<{ value: ManualOutcome; label: string }> => {
  if (action === "escalate_to_human") return [{ value: "escalated", label: "Escalated for human review" }];
  if (action === "do_nothing") return [{ value: "skipped", label: "Skipped by operator" }];
  return [{ value: "recovered", label: "Recovered (simulated)" }, { value: "not_recovered", label: "Not recovered (simulated)" }];
};

export default function ManualExecutionSimulation() {
  const [paymentId, setPaymentId] = useState("P04961");
  const [action, setAction] = useState<RecoveryAction>("retry_payment");
  const [outcome, setOutcome] = useState<ManualOutcome>("recovered");
  const [operatorNote, setOperatorNote] = useState("");
  const [recorded, setRecorded] = useState<{ status: string; amount: number; message: string; policy: string } | null>(null);
  const [isShowingProcessingFeedback, setIsShowingProcessingFeedback] = useState(false);
  const executionStartedAt = useRef<number | null>(null);
  const input = useMemo(() => ({ paymentId: paymentId.trim().toUpperCase(), action }), [paymentId, action]);
  const payments = trpc.recovery.payments.useQuery({ page: 1, pageSize: 50, status: "FAILED", sort: "probability_desc" });
  const preview = trpc.recovery.whatIf.useQuery(input, { enabled: Boolean(input.paymentId), retry: false });
  const utils = trpc.useUtils();
  const resetRecordedFeedback = () => setRecorded(null);

  const simulation = trpc.recovery.manualSimulate.useMutation({
    onSuccess: result => {
      const elapsed = performance.now() - (executionStartedAt.current ?? performance.now());
      const revealSuccess = () => {
        setRecorded({
          status: result.simulation.executionStatus,
          amount: result.simulation.amountRecovered,
          message: result.simulation.message,
          policy: result.simulation.policy.ruleCode,
        });
        window.dispatchEvent(new CustomEvent("revora:manual-simulation-recorded", { detail: { paymentId: input.paymentId, action, status: result.simulation.executionStatus, timestamp: new Date().toISOString() } }));
        setIsShowingProcessingFeedback(false);
        toast.success("Manual simulated outcome recorded", { description: "A policy decision, simulated action, and audit event were saved." });
      };

      window.setTimeout(revealSuccess, Math.max(0, minimumProcessingFeedbackMs - elapsed));
      void utils.recovery.dashboard.invalidate();
      void utils.recovery.operationsCenter.invalidate();
      void utils.recovery.paymentDetail.invalidate({ paymentId: input.paymentId });
      void utils.recovery.policyDecisions.invalidate({ paymentId: input.paymentId });
    },
    onError: error => {
      setIsShowingProcessingFeedback(false);
      toast.error("Manual simulation was not recorded", { description: error.message });
    },
  });
  const isExecuting = simulation.isPending || isShowingProcessingFeedback;

  const candidate = preview.data?.intelligence.candidates.find(item => item.action === action);
  const eligible = candidate?.policy.result === "approved";
  const selectPayment = (id: string) => {
    setPaymentId(id);
    resetRecordedFeedback();
  };
  const changeAction = (value: RecoveryAction) => {
    setAction(value);
    setOutcome(outcomesFor(value)[0]!.value);
    resetRecordedFeedback();
  };
  const executeSimulation = () => {
    executionStartedAt.current = performance.now();
    setIsShowingProcessingFeedback(true);
    resetRecordedFeedback();
    simulation.mutate({ paymentId: input.paymentId, action, outcome, operatorNote: operatorNote.trim() || undefined });
  };

  return <div className="rr-page mx-auto max-w-6xl space-y-5 pb-10">
    <section className="rr-command-hero relative overflow-hidden px-6 py-7 sm:px-8">
      <div className="rr-command-signal" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="rr-eyebrow text-teal-700">Operator simulation</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-.05em] text-slate-950">Manually record a <span className="text-teal-600">simulated outcome.</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Choose a source payment, an allowlisted recovery action, and a synthetic result. ReVora validates the fixed policy before recording any simulation evidence.</p>
        </div>
        <Button asChild variant="outline" className="self-start rounded-lg border-slate-200 bg-white"><Link href="/simulator">Open What-If Lab</Link></Button>
      </div>
    </section>

    <EnvironmentStrip>
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-bold text-amber-950">Simulation only — no external execution</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">This records an operator-selected test outcome and its audit evidence. It cannot retry a payment, send a message, charge a customer, alter a payment provider, or collect money.</p>
        </div>
      </div>
    </EnvironmentStrip>

    <div className="grid gap-5 xl:grid-cols-[.88fr_1.12fr]">
      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="rr-eyebrow">Manual execution scenario</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-900">Operator inputs</h2>
          </div>
          <ClipboardCheck className="h-5 w-5 text-teal-600" />
        </div>
        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Source payment</span>
            <select value={paymentId} disabled={isExecuting} onChange={event => selectPayment(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">
              {payments.isLoading ? <option>Loading payments…</option> : payments.data?.payments.map(payment => <option key={payment.id} value={payment.id}>{payment.id} · {currency.format(payment.amount)} · {humanize(payment.failureReason ?? "unknown")}</option>)}
            </select>
            <Input value={paymentId} disabled={isExecuting} onChange={event => selectPayment(event.target.value.toUpperCase())} className="mt-2 h-10 rounded-lg font-mono text-xs" aria-label="Manual payment ID" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Recovery action</span>
            <select value={action} disabled={isExecuting} onChange={event => changeAction(event.target.value as RecoveryAction)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">
              {actions.map(item => <option key={item} value={item}>{humanize(item)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Simulated outcome</span>
            <select value={outcome} disabled={isExecuting} onChange={event => { setOutcome(event.target.value as ManualOutcome); resetRecordedFeedback(); }} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50">
              {outcomesFor(action).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-bold text-slate-600">Operator note <span className="font-medium text-slate-400">Optional · {operatorNote.length}/240</span></span>
            <Input value={operatorNote} disabled={isExecuting} maxLength={240} onChange={event => { setOperatorNote(event.target.value); resetRecordedFeedback(); }} placeholder="Why is this being recorded?" className="mt-2 h-11 rounded-lg" />
          </label>
        </div>
      </section>

      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="rr-eyebrow">Policy validation</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-900">Review before recording</h2>
          </div>
          {preview.data ? <StatusPill status={candidate?.policy.result ?? "pending"} /> : null}
        </div>
        {preview.isLoading ? <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rr-skeleton h-24 rounded-xl" /><div className="rr-skeleton h-24 rounded-xl" /><div className="rr-skeleton h-24 rounded-xl" /></div> : preview.error || !preview.data || !candidate ? <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 p-5"><CircleAlert className="h-6 w-6 text-rose-600" /><p className="mt-2 text-sm font-bold text-rose-950">This payment could not be evaluated.</p><p className="mt-1 text-xs leading-5 text-rose-800">Choose a valid payment from the source list and try again.</p></div> : <div className="rr-policy-reveal mt-6 space-y-4" key={`${input.paymentId}-${action}-${candidate.policy.result}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-teal-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Recovery probability</p><p className="mt-1 text-2xl font-semibold text-teal-950">{Math.round(preview.data.intelligence.recoveryProbability * 100)}%</p></div>
            <div className="rounded-xl bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Expected value</p><p className="mt-1 text-2xl font-semibold text-blue-950">{currency.format(candidate.expectedRecoveryValue)}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected result</p><p className="mt-1 text-lg font-semibold text-slate-900">{humanize(outcome)}</p></div>
          </div>
          <div className={`rounded-xl border p-4 ${eligible ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
            <div className="flex gap-3"><ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${eligible ? "text-emerald-600" : "text-amber-700"}`} /><div><p className={`text-sm font-bold ${eligible ? "text-emerald-950" : "text-amber-950"}`}>{candidate.policy.ruleCode}</p><p className={`mt-1 text-xs leading-5 ${eligible ? "text-emerald-800" : "text-amber-900"}`}>{candidate.policy.reason}</p></div></div>
          </div>
          <div className="space-y-2">
            <Button disabled={isExecuting || !eligible} onClick={executeSimulation} className={`rr-execution-button w-full rounded-lg text-white disabled:bg-slate-300 ${recorded ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#5235bb] hover:bg-[#432a9a]"}`} aria-label={isExecuting ? "Recording manual simulation" : recorded ? "Manual simulation recorded" : "Execute manual simulation"} aria-live="polite">
              {isExecuting ? <><LoaderCircle className="rr-execution-spinner mr-2 h-4 w-4" />Recording simulated outcome…</> : recorded ? <><CheckCircle2 className="rr-execution-check mr-2 h-4 w-4" />Simulation recorded</> : <><PlayCircle className="mr-2 h-4 w-4" />Execute</>}
            </Button>
            <p className="text-center text-[11px] text-slate-500" aria-live="polite">{isExecuting ? "Validating and saving simulation audit evidence…" : recorded ? "Success: simulated evidence is available in the audit trail." : "This never initiates a payment, retry, customer message, or collection action."}</p>
          </div>
          {!eligible ? <p className="text-center text-xs text-amber-700">This selection is blocked or requires human review under fixed policy and cannot be recorded as an execution outcome.</p> : null}
        </div>}
      </section>
    </div>

    {recorded ? <section className="rr-execution-success rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><CheckCircle2 className="rr-execution-success-mark mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /><div><p className="text-sm font-bold text-emerald-950">Manual simulated outcome recorded</p><p className="mt-1 text-sm leading-6 text-emerald-900">{recorded.message}</p><p className="mt-2 text-xs font-semibold text-emerald-800">{recorded.policy} · {humanize(recorded.status)} · {recorded.amount > 0 ? `${currency.format(recorded.amount)} synthetic recovery recorded` : "No synthetic recovery amount recorded"}</p></div></div><Button asChild variant="outline" className="self-start rounded-lg border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100"><Link href="/control-center">View audit trail</Link></Button></div>
    </section> : null}
  </div>;
}
