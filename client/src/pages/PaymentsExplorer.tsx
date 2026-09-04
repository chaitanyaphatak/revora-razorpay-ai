import { StatusPill } from "@/components/recoverai/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CircleAlert, Filter, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function PaymentsExplorer() {
  const initialCustomerId = useMemo(() => new URLSearchParams(window.location.search).get("customerId")?.trim().toUpperCase() ?? "", []);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [sort, setSort] = useState<"newest" | "oldest" | "amount_desc" | "probability_desc">("probability_desc");
  const input = useMemo(() => ({ page, pageSize: 20, search: search || undefined, customerId: customerId || undefined, status: status || undefined, paymentMethod: method || undefined, sort }), [page, search, customerId, status, method, sort]);
  const { data, isLoading, error } = trpc.recovery.payments.useQuery(input);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / 20));
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); };
  const changeFilter = (setter: (value: string) => void, value: string) => { setPage(1); setter(value); };

  return <div className="rr-page mx-auto max-w-7xl space-y-6 pb-12">
    <section className="rr-command-hero relative overflow-hidden rounded-2xl border border-teal-100/70 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-6 shadow-xs sm:p-8">
      <div className="rr-command-signal" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Payment Intelligence</span>
            <span className="text-teal-400">/</span>
            <span className="text-teal-700">Live Ledger</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl sm:leading-tight">
            Search, Prioritize &amp; Inspect{" "}
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
              Recoverable Payment Trails
            </span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
            Search and filter real-time transaction records. Recovery scores represent machine-learned success probabilities with deterministic safety guardrails.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
              Dynamic Multi-Filter
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <Search className="h-3.5 w-3.5 text-cyan-600" />
              Instant Search Index
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
              <Filter className="h-3.5 w-3.5 text-emerald-600" />
              Probability Weighted
            </span>
          </div>
        </div>
      </div>
    </section>

    <section className="rr-surface p-4 sm:p-5">
      {customerId ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2"><p className="text-xs font-medium text-teal-800">Showing payments for <strong>{customerId}</strong></p><Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-teal-800 hover:bg-white" onClick={() => { setCustomerId(""); setPage(1); window.history.replaceState({}, "", "/payments"); }}>Clear customer filter</Button></div> : null}
      <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,minmax(0,0.55fr))_auto]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search payment ID" className="h-10 rounded-lg border-slate-200 bg-white pl-9 text-sm" /></div>
        <select value={status} onChange={event => changeFilter(setStatus, event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="">All statuses</option><option value="FAILED">Failed</option><option value="PENDING">Pending</option><option value="RECOVERED">Recovered</option><option value="SUCCEEDED">Succeeded</option></select>
        <select value={method} onChange={event => changeFilter(setMethod, event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="">All methods</option><option value="upi">UPI</option><option value="card">Card</option><option value="net_banking">Net banking</option><option value="wallet">Wallet</option></select>
        <select value={sort} onChange={event => { setPage(1); setSort(event.target.value as typeof sort); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"><option value="probability_desc">Probability: high to low</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount_desc">Amount: high to low</option></select>
        <Button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800"><Filter className="mr-2 h-4 w-4" />Apply</Button>
      </form>
    </section>

    <section className="rr-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-teal-600" /><p className="text-sm font-semibold text-slate-800">{data?.total.toLocaleString("en-IN") ?? "…"} matching payments</p></div><p className="text-xs text-slate-500">Page {page} of {pageCount}</p></div>
      {error ? <div className="p-8 text-center"><CircleAlert className="mx-auto h-7 w-7 text-orange-500" /><p className="mt-3 text-sm text-slate-600">Unable to retrieve payments. Please refresh or adjust the filters.</p></div> : <>
        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? Array.from({ length: 8 }).map((_, index) => <div className="p-4" key={index}><div className="rr-skeleton h-16 rounded-xl" /></div>) : data?.payments.map(payment => <Link key={payment.id} href={`/payments/${payment.id}`} className="rr-table-row block p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-extrabold text-slate-800">{payment.id}</p><p className="mt-1 text-xs text-slate-500">{payment.customerId} · {payment.failureReason?.replace(/_/g, " ") ?? "No failure"}</p></div><StatusPill status={payment.status} /></div><div className="mt-3 flex items-end justify-between"><div><p className="text-base font-extrabold text-slate-900">{currency.format(payment.amount)}</p><p className="mt-1 text-[11px] text-slate-500">{payment.paymentMethod.replace(/_/g, " ")} · Attempt {payment.attemptNumber}</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recovery</p><p className="mt-1 text-sm font-extrabold text-teal-700">{Math.round(payment.recoveryProbability * 100)}%</p></div></div></Link>)}
        </div>
        <div className="hidden overflow-x-auto md:block"><table className="min-w-[920px] w-full text-left"><thead className="bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Signal</th><th className="px-4 py-3">Recovery probability</th><th className="px-5 py-3 text-right">View</th></tr></thead><tbody className="divide-y divide-slate-100">{isLoading ? Array.from({ length: 8 }).map((_, index) => <tr key={index}><td colSpan={6} className="px-5 py-4"><div className="rr-skeleton h-6 rounded" /></td></tr>) : data?.payments.map(payment => <tr className="rr-table-row group" key={payment.id}><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-slate-800">{payment.id}</p><p className="mt-1 text-xs text-slate-500">{payment.customerId} · {dateTime.format(new Date(payment.timestamp))}</p></td><td className="px-4 py-4"><StatusPill status={payment.status} /></td><td className="px-4 py-4"><p className="font-bold text-slate-800">{currency.format(payment.amount)}</p><p className="mt-1 text-xs text-slate-500">{payment.paymentMethod.replace(/_/g, " ")} · {payment.gateway}</p></td><td className="max-w-[165px] px-4 py-4"><p className="truncate text-sm font-semibold text-slate-700">{payment.failureReason?.replace(/_/g, " ") ?? "No failure"}</p><p className="mt-1 text-xs text-slate-500">Attempt {payment.attemptNumber}</p></td><td className="px-4 py-4"><div className="flex items-center gap-2"><div className="rr-progress-track h-2 w-20"><div className="rr-progress-fill" style={{ width: `${Math.round(payment.recoveryProbability * 100)}%` }} /></div><span className="text-xs font-extrabold text-teal-700">{Math.round(payment.recoveryProbability * 100)}%</span></div></td><td className="px-5 py-4 text-right"><Link href={`/payments/${payment.id}`}><Button variant="ghost" size="sm" className="rr-row-action rounded-lg text-slate-700 hover:bg-white hover:text-teal-700">Inspect <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></Link></td></tr>)}</tbody></table></div>
      </>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5"><Button variant="outline" size="sm" className="rounded-lg" disabled={page <= 1} onClick={() => setPage(current => current - 1)}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Previous</Button><p className="text-xs font-medium text-slate-500">Showing {data?.payments.length ?? 0} records</p><Button variant="outline" size="sm" className="rounded-lg" disabled={page >= pageCount} onClick={() => setPage(current => current + 1)}>Next<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
    </section>
  </div>;
}
