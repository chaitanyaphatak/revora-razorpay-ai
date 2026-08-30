import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { trpc } from "@/lib/trpc";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, CircleAlert, CircleCheck, Gauge, LineChart, PieChart as PieChartIcon, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useState } from "react";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" });
const wholeCurrency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 1 });

const trendConfig = {
  atRiskAmount: { label: "At-risk exposure", color: "#e11d48" },
  expectedRecoveryValue: { label: "Expected recoverable value", color: "#6d28d9" },
  observedRecoveredRevenue: { label: "Observed simulated recovery", color: "#0f9488" },
} satisfies ChartConfig;
const failureConfig = { expectedRecoveryValue: { label: "Expected recoverable value", color: "#0f9488" } } satisfies ChartConfig;
const propensityConfig = { atRiskAmount: { label: "At-risk exposure", color: "#2563eb" }, expectedRecoveryValue: { label: "Expected recoverable value", color: "#6d28d9" } } satisfies ChartConfig;
const agingConfig = { outstandingAmount: { label: "Outstanding exposure", color: "#d97706" }, expectedRecoveryValue: { label: "Expected recoverable value", color: "#0f9488" } } satisfies ChartConfig;
const promiseConfig = { promisedAmount: { label: "Promised amount", color: "#6d28d9" } } satisfies ChartConfig;
const policyColors = ["#0f9488", "#d97706", "#e11d48", "#2563eb", "#64748b"];

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Target; tone: "teal" | "violet" | "rose" | "blue" | "amber" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <article className="rr-kpi"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="rr-metric-value mt-4 text-2xl font-semibold tracking-[-.055em] text-slate-950">{value}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-[11px] leading-4 text-slate-500">{detail}</p></article>;
}

function SurfaceHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return <div><p className="rr-eyebrow">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold tracking-[-.035em] text-slate-900">{title}</h2>{detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}</div>;
}

function AnalyticsLoading() {
  return <div className="space-y-5"><div className="rr-skeleton h-36 rounded-2xl" /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div className="rr-skeleton h-36 rounded-2xl" key={index} />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="rr-skeleton h-[340px] rounded-2xl" /><div className="rr-skeleton h-[340px] rounded-2xl" /></div></div>;
}

export default function AnalyticsWorkspace() {
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "12M">("30D");
  const { data, error, isLoading, isFetching, refetch } = trpc.analytics.overview.useQuery({ range }, { staleTime: 60_000, refetchOnWindowFocus: false });

  if (isLoading) return <AnalyticsLoading />;
  if (error || !data) return <section className="rr-surface mx-auto max-w-6xl p-8"><CircleAlert className="h-8 w-8 text-rose-500" /><h1 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-slate-950">Analytics are temporarily unavailable</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">ReVora could not load its source-backed analytic view. No data was changed; you can safely retry the read-only request.</p><Button onClick={() => refetch()} className="mt-5 rounded-lg">Retry analytics</Button></section>;

  const topFailure = data.failureExposure[0];
  const totalPolicyEvents = data.policyDistribution.reduce((sum, item) => sum + item.count, 0);

  return <div className="rr-page mx-auto max-w-[1540px] space-y-5 pb-10">
    <section className="rr-analytics-hero relative overflow-hidden px-6 py-8 sm:px-8">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="rr-analytics-kicker">Revenue intelligence · source-backed</p>
          <h1 className="rr-analytics-title">Analytics <em>Studio.</em></h1>
          <p className="rr-analytics-lead">Interrogate risk-weighted exposure, recovery propensity, policy posture, and receivables health through traceable ReVora data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="rr-analytics-range">
            <span className="text-slate-500">Range</span>
            <select value={range} onChange={event => setRange(event.target.value as "7D" | "30D" | "90D" | "12M")} aria-label="Analytics date range">
              <option>7D</option>
              <option>30D</option>
              <option>90D</option>
              <option>12M</option>
            </select>
          </label>
          <Button variant="outline" className="h-9 rounded-lg border-slate-200 bg-white text-xs shadow-sm" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "rr-execution-spinner" : ""}`} />
            {isFetching ? "Refreshing…" : "Refresh analysis"}
          </Button>
        </div>
      </div>
    </section>

    <section className="rr-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Portfolio ERV" value={currency.format(data.metrics.portfolioExpectedRecoveryValue)} detail="Payment ERV plus current receivables ERV" icon={Target} tone="violet" />
      <MetricCard label="Payment risk exposure" value={currency.format(data.metrics.revenueAtRisk)} detail={`${range} failed or pending payment value`} icon={Activity} tone="rose" />
      <MetricCard label="Observed recovery" value={currency.format(data.metrics.observedRecoveredRevenue)} detail="Successful simulated payment and invoice evidence" icon={CircleCheck} tone="teal" />
      <MetricCard label="Policy approval rate" value={percent.format(data.metrics.policyApprovalRate)} detail="Policy-bearing audit events in the selected window" icon={ShieldCheck} tone="blue" />
      <MetricCard label="Case coverage" value={percent.format(data.metrics.caseCoverageRate)} detail="At-risk payments with a recovery case" icon={Gauge} tone="amber" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
      <article className="rr-surface p-5 sm:p-6">
        <SurfaceHeading eyebrow="Exposure trajectory" title="Risk-weighted value through time" detail="At-risk exposure, expected recoverable value, and observed simulated recovery are distinct measures." />
        <div className="rr-chart-legend">
          <span><i style={{ background: "#e11d48" }} />At-risk exposure</span>
          <span><i style={{ background: "#6d28d9" }} />Expected recoverable value</span>
          <span><i style={{ background: "#0f9488" }} />Observed simulated recovery</span>
        </div>
        <ChartContainer config={trendConfig} className="mt-4 h-[310px] w-full aspect-auto">
          <ComposedChart data={data.exposureTrend} margin={{ left: -8, right: 8, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsRisk" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e11d48" stopOpacity={.28} /><stop offset="100%" stopColor="#e11d48" stopOpacity={0} /></linearGradient>
              <linearGradient id="analyticsErv" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6d28d9" stopOpacity={.22} /><stop offset="100%" stopColor="#6d28d9" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf1f5" strokeDasharray="3 6" />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} tickFormatter={value => currency.format(Number(value))} />
            <ChartTooltip content={<ChartTooltipContent formatter={value => wholeCurrency.format(Number(value))} />} />
            <Area type="monotone" dataKey="atRiskAmount" stroke="#e11d48" strokeWidth={2.2} fill="url(#analyticsRisk)" />
            <Area type="monotone" dataKey="expectedRecoveryValue" stroke="#6d28d9" strokeWidth={2.4} fill="url(#analyticsErv)" />
            <Line type="monotone" dataKey="observedRecoveredRevenue" stroke="#0f9488" strokeWidth={2.4} dot={{ r: 3, fill: "#0f9488", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ChartContainer>
      </article>
      <article className="rr-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <SurfaceHeading eyebrow="Policy posture" title="Decision governance mix" detail={`${totalPolicyEvents.toLocaleString("en-IN")} policy-bearing audit events in ${range}`} />
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><PieChartIcon className="h-4 w-4" /></span>
        </div>
        {data.policyDistribution.length ? <>
          <ChartContainer config={{}} className="mt-2 h-[220px] w-full aspect-auto">
            <PieChart>
              <Pie data={data.policyDistribution} dataKey="count" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="#fff" strokeWidth={3}>
                {data.policyDistribution.map((item, index) => <Cell key={item.status} fill={policyColors[index % policyColors.length]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent formatter={value => Number(value).toLocaleString("en-IN")} />} />
            </PieChart>
          </ChartContainer>
          <div className="grid gap-2">{data.policyDistribution.map((item, index) => <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2" key={item.status}><span className="flex items-center gap-2 text-xs font-semibold text-slate-700"><i className="h-2 w-2 rounded-full" style={{ background: policyColors[index % policyColors.length] }} />{item.label}</span><span className="text-[11px] font-bold text-slate-500">{item.count.toLocaleString("en-IN")} · {percent.format(item.share)}</span></div>)}</div>
        </> : <p className="mt-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Policy events will appear as simulated decisions are recorded.</p>}
      </article>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <article className="rr-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><SurfaceHeading eyebrow="Concentration analysis" title="Expected value by failure signal" detail={topFailure ? `${topFailure.label} represents ${percent.format(data.metrics.concentrationRatio)} of payment ERV.` : "No at-risk payment exposure in this window."} /><BarChart3 className="h-5 w-5 text-teal-600" /></div><ChartContainer config={failureConfig} className="mt-5 h-[295px] w-full aspect-auto"><BarChart data={data.failureExposure.slice(0, 6)} layout="vertical" barCategoryGap="22%" margin={{ left: 8, right: 12, top: 4, bottom: 0 }}><defs><linearGradient id="analyticsFailure" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#0b746c" /><stop offset="100%" stopColor="#1bb8a6" /></linearGradient></defs><CartesianGrid horizontal={false} stroke="#edf1f5" strokeDasharray="3 6" /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} tickFormatter={value => currency.format(Number(value))} /><YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} /><ChartTooltip content={<ChartTooltipContent formatter={value => wholeCurrency.format(Number(value))} />} /><Bar dataKey="expectedRecoveryValue" fill="url(#analyticsFailure)" radius={[0, 8, 8, 0]} /></BarChart></ChartContainer></article>
      <article className="rr-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><SurfaceHeading eyebrow="Propensity segmentation" title="Recovery potential distribution" detail={`${currency.format(data.metrics.highPropensityExposure)} ERV sits in the 75–100% propensity band.`} /><Sparkles className="h-5 w-5 text-violet-600" /></div><div className="rr-chart-legend"><span><i style={{ background: "#2563eb" }} />At-risk exposure</span><span><i style={{ background: "#6d28d9" }} />Expected recoverable value</span></div><ChartContainer config={propensityConfig} className="mt-3 h-[275px] w-full aspect-auto"><BarChart data={data.propensityBands} barCategoryGap="28%" barGap={4} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f5" strokeDasharray="3 6" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} tickFormatter={value => currency.format(Number(value))} /><ChartTooltip content={<ChartTooltipContent formatter={value => wholeCurrency.format(Number(value))} />} /><Bar dataKey="atRiskAmount" fill="#2563eb" radius={[8, 8, 0, 0]} /><Bar dataKey="expectedRecoveryValue" fill="#6d28d9" radius={[8, 8, 0, 0]} /></BarChart></ChartContainer></article>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="rr-surface p-5 sm:p-6"><SurfaceHeading eyebrow="Receivables aging" title="Outstanding invoice exposure by delinquency" detail={data.receivables.setupRequired ? "Receivables analytics will activate after the approved source tables are available." : `${data.receivables.metrics.overdueCount.toLocaleString("en-IN")} overdue invoices · ${currency.format(data.receivables.metrics.overdueAmount)} exposure.`} />{data.receivables.setupRequired ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Receivables source tables are not yet available.</div> : <><div className="rr-chart-legend"><span><i style={{ background: "#d97706" }} />Outstanding exposure</span><span><i style={{ background: "#0f9488" }} />Expected recoverable value</span></div><ChartContainer config={agingConfig} className="mt-3 h-[260px] w-full aspect-auto"><BarChart data={data.receivables.aging} barCategoryGap="26%" barGap={4} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f5" strokeDasharray="3 6" /><XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} tickFormatter={value => currency.format(Number(value))} /><ChartTooltip content={<ChartTooltipContent formatter={value => wholeCurrency.format(Number(value))} />} /><Bar dataKey="outstandingAmount" fill="#d97706" radius={[8, 8, 0, 0]} /><Bar dataKey="expectedRecoveryValue" fill="#0f9488" radius={[8, 8, 0, 0]} /></BarChart></ChartContainer></>}</article>
      <article className="rr-surface p-5 sm:p-6"><SurfaceHeading eyebrow="Commitment reliability" title="Promise-to-pay posture" detail="A promise is classified as missed when its active promised date has passed." />{data.receivables.setupRequired ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Promise reliability will appear with receivables source data.</div> : <><ChartContainer config={promiseConfig} className="mt-5 h-[205px] w-full aspect-auto"><BarChart data={data.receivables.promiseReliability} barCategoryGap="32%" margin={{ left: -8, right: 8, top: 8, bottom: 0 }}><defs><linearGradient id="analyticsPromise" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf1f5" strokeDasharray="3 6" /><XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7b8798" }} tickFormatter={value => currency.format(Number(value))} /><ChartTooltip content={<ChartTooltipContent formatter={value => wholeCurrency.format(Number(value))} />} /><Bar dataKey="promisedAmount" fill="url(#analyticsPromise)" radius={[8, 8, 0, 0]} /></BarChart></ChartContainer><div className="mt-4 grid grid-cols-3 gap-2">{data.receivables.promiseReliability.map(item => <div className="rounded-xl bg-slate-50 p-3" key={item.status}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.status}</p><p className="rr-metric-value mt-1 text-lg font-semibold tracking-[-.04em] text-slate-900">{item.count.toLocaleString("en-IN")}</p><p className="mt-1 text-[10px] text-slate-500">{currency.format(item.promisedAmount)}</p></div>)}</div></>}</article>
    </section>

    <section className="rr-surface overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><SurfaceHeading eyebrow="Intervention portfolio" title="Recommended actions and observed simulation evidence" detail="Observed success rate is descriptive of recorded synthetic runs; it is not a causal-effect estimate." /><LineChart className="h-5 w-5 shrink-0 text-violet-600" /></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500"><tr><th className="px-5 py-3">Recommended action</th><th className="px-3 py-3 text-right">Cases</th><th className="px-3 py-3 text-right">Expected value</th><th className="px-3 py-3 text-right">Simulated runs</th><th className="px-3 py-3 text-right">Observed success</th><th className="px-5 py-3 text-right">Recorded recovery</th></tr></thead><tbody>{data.actionPerformance.slice(0, 8).map(action => <tr key={action.action} className="rr-table-row border-t border-slate-100"><td className="px-5 py-3 text-xs font-semibold text-slate-800">{action.label}</td><td className="px-3 py-3 text-right text-xs text-slate-600">{action.caseCount.toLocaleString("en-IN")}</td><td className="px-3 py-3 text-right text-xs font-semibold text-violet-700">{wholeCurrency.format(action.expectedRecoveryValue)}</td><td className="px-3 py-3 text-right text-xs text-slate-600">{action.simulatedRuns.toLocaleString("en-IN")}</td><td className="px-3 py-3 text-right text-xs font-semibold text-teal-700">{action.observedSuccessRate === null ? "—" : percent.format(action.observedSuccessRate)}</td><td className="px-5 py-3 text-right text-xs font-semibold text-slate-800">{wholeCurrency.format(action.observedRecoveredRevenue)}</td></tr>)}</tbody></table></div></section>

    <section className="grid gap-3 md:grid-cols-3"><article className="rr-surface p-5"><p className="rr-eyebrow">Metric definition</p><h2 className="mt-2 text-sm font-semibold text-slate-900">Expected Recoverable Value</h2><p className="mt-2 text-xs leading-5 text-slate-500">ERV is exposure multiplied by the existing bounded recovery probability. It represents prioritization potential, not a guarantee of recovery.</p></article><article className="rr-surface p-5"><p className="rr-eyebrow">Metric definition</p><h2 className="mt-2 text-sm font-semibold text-slate-900">Concentration ratio</h2><p className="mt-2 text-xs leading-5 text-slate-500">The largest failure signal’s share of payment ERV. High concentration indicates a focused diagnostic opportunity.</p></article><article className="rr-surface p-5"><p className="rr-eyebrow">Interpretation boundary</p><h2 className="mt-2 text-sm font-semibold text-slate-900">Observed simulation evidence</h2><p className="mt-2 text-xs leading-5 text-slate-500">Recorded results describe explicit synthetic simulations and policy decisions only. They do not represent real payment processing or collection outcomes.</p></article></section>
  </div>;
}
