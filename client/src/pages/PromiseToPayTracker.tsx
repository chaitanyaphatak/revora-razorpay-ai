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
    {hasDemoRows ? <EnvironmentStrip><span><strong>Simulation demonstration commitments.</strong> Promise-to-Pay records linked to an invoice beginning with <code>DEMO-</code> are synthetic scenarios for review. They are not customer commitments.</span></EnvironmentStrip> : null}
    <section className="rr-surface border-l-4 border-l-violet-500 p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="rr-eyebrow">Receivables commitments</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950">Promise-to-Pay tracker</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Track operator-recorded simulated payment commitments. Active commitments past their promised date are flagged as missed for human review.</p></div>
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="">All commitments</option><option value="active">Active</option><option value="missed">Missed</option><option value="kept">Kept</option><option value="cancelled">Cancelled</option></select>
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
    <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="text-sm font-bold text-amber-950">Missed-promise detection is a review signal</p><p className="mt-1 text-sm leading-6 text-amber-900">A commitment is flagged when it remains active after its promised date. ReVora does not mark it kept, send a follow-up, or change an invoice automatically.</p></div></div></section>
  </div>;
}
