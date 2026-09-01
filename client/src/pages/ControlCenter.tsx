import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { trpc } from "@/lib/trpc";
import { Activity, Bot, CircleAlert, ClipboardList, Clock3, Gauge, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

function ControlSkeleton() {
  return <div className="space-y-5"><div className="rr-skeleton h-40 rounded-xl" /><div className="grid gap-5 xl:grid-cols-2"><div className="rr-skeleton h-72 rounded-xl" /><div className="rr-skeleton h-72 rounded-xl" /></div></div>;
}

function auditSummary(status?: string | null) {
  if (status === "approved") return "Policy validation approved a synthetic recovery path.";
  if (status === "blocked") return "Policy validation kept the configured safety boundary in place.";
  if (status === "human_review_required") return "The case was routed to human review by deterministic policy.";
  return "A policy-governed operational event was recorded.";
}

function relativeTime(timestamp: string) {
  const minutes = Math.round((new Date(timestamp).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  if (Math.abs(minutes) < 1_440) return formatter.format(Math.round(minutes / 60), "hour");
  return formatter.format(Math.round(minutes / 1_440), "day");
}

export default function ControlCenter() {
  const { data, isLoading, error } = trpc.recovery.operationsCenter.useQuery(undefined, { staleTime: 20_000 });
  const [showAllAudit, setShowAllAudit] = useState(false);

  if (isLoading) return <ControlSkeleton />;
  if (error || !data) return <section className="rr-surface p-8"><CircleAlert className="h-8 w-8 text-rose-500" /><h1 className="mt-4 text-2xl font-semibold">Control center is temporarily unavailable</h1><p className="mt-2 text-sm text-slate-500">The operational aggregates could not be retrieved from Supabase.</p></section>;

  const visibleAuditEvents = showAllAudit ? data.auditEvents : data.auditEvents.slice(0, 12);

  return <div className="rr-page mx-auto max-w-7xl space-y-5 pb-10">
    <section className="border-b border-slate-200 pb-5">
      <p className="rr-eyebrow">Recovery control center</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-.05em] text-slate-950">Operate with a <span className="text-teal-600">visible safety boundary.</span></h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Monitor policy-bound candidates, understand playbook economics, prioritize human review, and read audit events as business decisions—not hidden automation.</p>
    </section>

    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Autopilot policy profile</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Read-only safety envelope</h2></div><ShieldCheck className="h-5 w-5 text-teal-600" /></div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-teal-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Max amount</p><p className="mt-1 text-lg font-semibold text-teal-900">{currency.format(data.autopilot.maxAmount)}</p></div>
          <div className="rounded-lg bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Min probability</p><p className="mt-1 text-lg font-semibold text-blue-900">{Math.round(data.autopilot.minProbability * 100)}%</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Retry boundary</p><p className="mt-1 text-lg font-semibold text-slate-800">{data.autopilot.maxRetryAttempt - 1} retry</p></div>
        </div>
      </section>
      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Autopilot activity</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Eligible candidates and latest outcomes</h2></div><Bot className="h-5 w-5 text-blue-600" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-teal-100 bg-teal-50 p-4"><p className="text-3xl font-semibold tracking-[-.05em] text-teal-800">{data.autopilot.eligibleCount}</p><p className="mt-1 text-xs font-bold text-teal-700">visible eligible candidates</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-3xl font-semibold tracking-[-.05em] text-slate-800">{data.autopilot.activity.length}</p><p className="mt-1 text-xs font-bold text-slate-500">recent simulated outcomes</p></div></div>
        <div className="mt-4 space-y-2">{data.autopilot.activity.slice(0, 3).map(item => <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5" key={`${item.paymentId}-${item.executedAt}`}><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs font-bold text-slate-700">{item.paymentId}</p><p className="mt-0.5 text-xs text-slate-500">{humanize(item.action)}</p></div><StatusPill status={item.status} /></div><p className="mt-1 text-[11px] text-slate-500">{auditSummary(item.status)}</p><details className="mt-1.5 text-[10px] text-slate-500"><summary className="cursor-pointer font-semibold text-slate-600">View details</summary><p className="mt-1 leading-4">{item.message ?? `Policy-controlled simulated action for ${item.paymentId}.`}</p></details></div>)}</div>
      </section>
    </div>

    <section className="rr-surface p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Playbook analytics</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Which recovery routes hold the most value?</h2></div><Gauge className="h-5 w-5 text-teal-600" /></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.playbooks.map(playbook => <article className="rounded-xl border border-slate-100 bg-white p-4" key={playbook.action}><p className="text-sm font-semibold text-slate-800">{humanize(playbook.action)}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xl font-semibold tracking-[-.04em] text-teal-800">{currency.format(playbook.expectedValue)}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">expected recovery value</p></div><p className="text-sm font-bold text-slate-700">{playbook.cases}</p></div><div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Resolved</span><span className="font-bold text-slate-700">{Math.round(playbook.recoveryRate * 100)}%</span></div></article>)}</div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Human escalation queue</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Cases outside the safety envelope</h2></div><UserRound className="h-5 w-5 text-amber-500" /></div>
        <div className="mt-5 space-y-2">{data.escalationQueue.length ? data.escalationQueue.slice(0, 7).map(item => <Link key={item.caseId} href={`/payments/${item.paymentId}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-100 bg-white p-3.5 transition-colors hover:border-teal-100 hover:bg-teal-50/35 sm:grid-cols-[1.1fr_.9fr_auto]"><div><p className="font-mono text-xs font-semibold text-slate-800">{item.paymentId}</p><p className="mt-1 text-xs text-slate-500">{item.customerId} · {humanize(item.diagnosis)}</p></div><div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{currency.format(item.amount)}</p><p className="mt-1 text-xs text-slate-500">{Math.round(item.probability * 100)}% recovery probability</p></div><StatusPill status={item.caseStatus} /></Link>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No current cases require human escalation.</p>}</div>
      </section>
      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="rr-eyebrow">Audit center</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Detailed decision timeline</h2></div><ClipboardList className="h-5 w-5 text-slate-500" /></div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Chronological policy, action, and outcome context from immutable audit records. Every entry links to its source payment.</p>
        <div className="mt-5 space-y-0">{visibleAuditEvents.map((item, index, list) => <div className="relative flex gap-3 pb-5" key={item.id}><span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Activity className="h-3.5 w-3.5 text-teal-600" /></span>{index !== list.length - 1 ? <span className="absolute left-4 top-8 h-[calc(100%-1rem)] border-l border-dashed border-slate-200" /> : null}<div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/payments/${item.paymentId}`} className="font-mono text-xs font-semibold text-teal-700 hover:text-teal-900">{item.paymentId}</Link><p className="mt-0.5 text-sm font-semibold text-slate-800">{humanize(item.action)}</p></div><StatusPill status={item.executionResult ?? item.policyResult} className="scale-90 origin-right" /></div><p className="mt-2 text-xs leading-5 text-slate-500">{auditSummary(item.executionResult ?? item.policyResult)}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Clock3 className="h-3 w-3" />{relativeTime(item.timestamp)}</span>{item.policyResult ? <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Policy: {humanize(item.policyResult)}</span> : null}{item.amountRecovered > 0 ? <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Recovered: {currency.format(item.amountRecovered)}</span> : null}</div><details className="mt-2 text-[10px] text-slate-500"><summary className="cursor-pointer font-semibold text-slate-600">View details</summary><p className="mt-1 leading-4">{item.reason ?? "Recovery decision recorded."} · {dateTime.format(new Date(item.timestamp))}</p></details></div></div>)}</div>
        {data.auditEvents.length > 12 ? <button type="button" onClick={() => setShowAllAudit(value => !value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">{showAllAudit ? "Show latest 12 events" : `Show all ${data.auditEvents.length} audit events`}</button> : null}
      </section>
    </div>
  </div>;
}
