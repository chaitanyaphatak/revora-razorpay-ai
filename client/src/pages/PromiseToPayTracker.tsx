import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnvironmentStrip } from "@/components/recoverai/DesignPrimitives";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SetupRequired, date, label, money } from "./ReceivablesDashboard";

export default function PromiseToPayTracker() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const filters = useMemo(() => ({ page, pageSize: 20, status: (status || undefined) as "active" | "kept" | "missed" | "cancelled" | "unknown" | undefined }), [page, status]);
  const tracker = trpc.invoices.promises.useQuery(filters);
  const rows = tracker.data?.promises ?? [];
  const hasDemoRows = rows.some(promise => promise.isSimulationDemo);

  return <div className="rr-page mx-auto max-w-7xl space-y-5 pb-10">
    <Link href="/invoices"><Button variant="ghost" className="-ml-3 rounded-lg text-slate-600 hover:bg-slate-100"><ArrowLeft className="mr-2 h-4 w-4" />Back to invoices</Button></Link>
    <section className="rr-command-hero relative overflow-hidden rounded-2xl border border-teal-100/70 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-6 shadow-xs sm:p-8">
      <div className="rr-command-signal" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Receivables Commitments</span>
            <span className="text-teal-400">/</span>
            <span className="text-teal-700">Promise Engine</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl sm:leading-tight">
            Track &amp; Manage{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
              Promise-to-Pay Commitments
            </span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
            Track operator-recorded simulated payment commitments. Active commitments past their promised date are flagged as missed for human review.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />
              Commitment Timeline
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
              Missed Promise Detection
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <Clock3 className="h-3.5 w-3.5 text-purple-600" />
              Isolated Audit Trail
            </span>
          </div>
        </div>
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm self-start lg:self-center"><option value="">All commitments</option><option value="active">Active</option><option value="missed">Missed</option><option value="kept">Kept</option><option value="cancelled">Cancelled</option></select>
      </div>
    </section>
    {tracker.data?.setupRequired ? <SetupRequired message={tracker.data.message} /> : null}
    <section className="rr-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6"><div><p className="rr-eyebrow">Commitment queue</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-950">Track upcoming and missed commitments</h2></div><CalendarClock className="h-5 w-5 text-violet-600" /></div>
      {tracker.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="rr-skeleton h-16 rounded-xl" />)}</div> : tracker.error ? <div className="p-6 text-sm text-rose-700">{tracker.error.message}</div> : !rows.length ? <div className="p-10 text-center"><Clock3 className="rr-empty-icon mx-auto h-8 w-8 text-violet-300" /><p className="mt-3 text-sm font-bold text-slate-700">No Promise-to-Pay records found</p><p className="mt-1 text-sm text-slate-500">Create a policy-approved simulated commitment from an overdue invoice detail page.</p></div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 sm:px-6">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3 text-right">Promised / outstanding</th><th className="px-5 py-3">Promise date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(promise => <tr key={promise.id} className="rr-table-row"><td className="px-5 py-4 sm:px-6"><p className="font-mono text-sm font-bold text-slate-800">{promise.invoiceId}</p>{promise.isSimulationDemo ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">Simulation demo</p> : null}</td><td className="px-5 py-4 text-sm font-semibold text-slate-700">{promise.customerName ?? "Customer record"}</td><td className="px-5 py-4 text-right"><p className="text-sm font-semibold text-slate-800">{money(promise.promisedAmount)}</p><p className="mt-1 text-xs text-slate-400">of {money(promise.outstandingAmount)}</p></td><td className="px-5 py-4 text-sm text-slate-600">{date(promise.promisedDate)}</td><td className="px-5 py-4"><Badge variant="outline" className={promise.isMissed ? "border-rose-100 bg-rose-50 text-rose-700" : "border-teal-100 bg-teal-50 text-teal-700"}>{promise.isMissed ? <><AlertTriangle className="mr-1 h-3 w-3" />Missed</> : <><CheckCircle2 className="mr-1 h-3 w-3" />{label(promise.status)}</>}</Badge></td><td className="px-5 py-4"><Link href={`/invoices/${promise.invoiceId}`}><Button variant="ghost" size="sm" className="rr-row-action rounded-lg text-teal-700 hover:bg-teal-50">Review</Button></Link></td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs text-slate-500">{tracker.data?.total ?? 0} commitment{tracker.data?.total === 1 ? "" : "s"}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-lg">Previous</Button><Button variant="outline" size="sm" disabled={rows.length < 20} onClick={() => setPage(value => value + 1)} className="rounded-lg">Next</Button></div></div>
      </>}
    </section>
  </div>;
}
