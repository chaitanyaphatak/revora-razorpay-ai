import { EnvironmentStrip } from "@/components/recoverai/DesignPrimitives";
import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, BellRing, CircleAlert, Clock3, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function relativeTime(timestamp: string) {
  const minutes = Math.round((new Date(timestamp).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  if (Math.abs(minutes) < 1_440) return formatter.format(Math.round(minutes / 60), "hour");
  return formatter.format(Math.round(minutes / 1_440), "day");
}

function isManualSimulation(event: { actor?: string | null; diagnosis?: string | null; reason?: string | null }) {
  return event.actor === "manual_simulation_operator" || event.diagnosis === "manual_recovery_simulation" || event.reason?.includes("[SIMULATED MANUAL]") === true;
}

export default function ActivityWorkspace() {
  const [filter, setFilter] = useState<"all" | "manual">("all");
  const { data, isLoading, error, refetch, isFetching } = trpc.recovery.operationsCenter.useQuery(undefined, { staleTime: 15_000 });
  const events = useMemo(() => (data?.auditEvents ?? []).filter(event => filter === "all" || isManualSimulation(event)), [data?.auditEvents, filter]);
  const manualCount = data?.auditEvents.filter(event => isManualSimulation(event)).length ?? 0;

  if (isLoading) return <div className="rr-page mx-auto max-w-6xl space-y-5 pb-10"><div className="rr-skeleton h-36 rounded-2xl" /><div className="rr-skeleton h-[560px] rounded-2xl" /></div>;
  if (error || !data) return <section className="rr-surface mx-auto max-w-6xl p-8"><CircleAlert className="h-8 w-8 text-rose-500" /><h1 className="mt-4 text-2xl font-semibold text-slate-950">Activity is temporarily unavailable</h1><p className="mt-2 text-sm text-slate-500">The audit evidence could not be loaded from the current recovery source.</p><Button onClick={() => refetch()} className="mt-5 rounded-lg">Retry Activity</Button></section>;

  return <div className="rr-page mx-auto max-w-6xl space-y-5 pb-10">
    <section className="rr-command-hero relative overflow-hidden px-6 py-7 sm:px-8"><div className="rr-command-signal" /><div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="rr-eyebrow text-teal-700">Recovery evidence</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.05em] text-slate-950">Activity and <span className="text-teal-600">simulation records.</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review timestamped policy, action, and audit evidence. Manual simulations are clearly identified and remain synthetic only.</p></div><Button onClick={() => refetch()} variant="outline" className="self-start rounded-lg border-slate-200 bg-white">{isFetching ? <RefreshCw className="rr-execution-spinner mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}{isFetching ? "Refreshing…" : "Refresh Activity"}</Button></div></section>

    <EnvironmentStrip><span><strong>Simulation boundary.</strong> Activity records explain synthetic policy and audit evidence. They do not represent a real charge, customer message, payment retry, or collection action.</span></EnvironmentStrip>

    <section className="rr-stagger grid gap-3 sm:grid-cols-3"><article className="rr-kpi"><p className="rr-eyebrow">Audit events</p><p className="mt-3 text-2xl font-semibold tracking-[-.05em] text-slate-950">{data.auditEvents.length.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">Current recovery evidence</p></article><article className="rr-kpi"><p className="rr-eyebrow">Manual simulations</p><p className="mt-3 text-2xl font-semibold tracking-[-.05em] text-teal-700">{manualCount.toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">Operator-selected synthetic outcomes</p></article><article className="rr-kpi"><p className="rr-eyebrow">Latest evidence</p><p className="mt-3 text-sm font-semibold text-slate-900">{data.auditEvents[0] ? relativeTime(data.auditEvents[0].timestamp) : "No records"}</p><p className="mt-1 text-xs text-slate-500">Most recent recorded event</p></article></section>

    <section className="rr-surface overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="rr-eyebrow">Audit timeline</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-950">Policy-governed recovery activity</h2></div><div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setFilter("all")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>All activity</button><button type="button" onClick={() => setFilter("manual")} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === "manual" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500"}`}>Manual simulations</button></div></div>
      <div className="divide-y divide-slate-100">{events.length ? events.map(event => { const manual = isManualSimulation(event); return <article key={event.id} className="rr-table-row flex gap-3 p-4 sm:p-5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${manual ? "bg-violet-50 text-violet-600" : "bg-teal-50 text-teal-600"}`}>{manual ? <ClipboardCheck className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/payments/${event.paymentId}`} className="font-mono text-xs font-semibold text-teal-700 hover:text-teal-900">{event.paymentId}</Link>{manual ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Manual simulation</span> : null}</div><p className="mt-1 text-sm font-semibold text-slate-800">{humanize(event.action)}</p></div><StatusPill status={event.executionResult ?? event.policyResult} /></div><p className="mt-2 text-xs leading-5 text-slate-500">{manual ? "An operator-selected simulated outcome was recorded after deterministic policy validation." : "A deterministic policy-governed recovery event was recorded."}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Clock3 className="h-3 w-3" />{relativeTime(event.timestamp)}</span>{event.policyResult ? <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Policy: {humanize(event.policyResult)}</span> : null}{event.amountRecovered > 0 ? <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Recovered: {currency.format(event.amountRecovered)}</span> : null}</div><details className="mt-2 text-[11px] text-slate-500"><summary className="cursor-pointer font-semibold text-slate-600">View record details</summary><p className="mt-1 leading-5">{event.reason ?? "Recovery audit event recorded."} · {dateTime.format(new Date(event.timestamp))}</p></details></div></article>; }) : <div className="p-10 text-center"><BellRing className="rr-empty-icon mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No matching activity records</p><p className="mt-1 text-sm text-slate-500">Record a policy-approved manual simulation to add timestamped synthetic audit evidence.</p></div>}</div>
    </section>
  </div>;
}
