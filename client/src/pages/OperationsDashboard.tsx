import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { AnimatedMetric, EnvironmentStrip } from "@/components/recoverai/DesignPrimitives";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Download,
  ExternalLink,
  Gauge,
  Headphones,
  Lightbulb,
  ListFilter,
  Mail,
  Mic,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Link } from "wouter";
import { EmailPreviewModal, type EmailPreviewData } from "@/components/recoverai/EmailPreviewModal";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 1 });

const trendConfig = {
  atRisk: { label: "Revenue at risk", color: "#ef8a79" },
  recovered: { label: "Recovered", color: "#0f9488" },
} satisfies ChartConfig;

const actionConfig = { recoverableRevenue: { label: "Recoverable revenue", color: "#0f9488" } } satisfies ChartConfig;

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rr-skeleton h-28 rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="rr-skeleton h-36 rounded-2xl" key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="rr-skeleton h-80 rounded-2xl" />
        <div className="rr-skeleton h-80 rounded-2xl" />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  format,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  detail: string;
  icon: typeof CircleDollarSign;
  tone: "critical" | "success" | "primary" | "warning" | "ai";
}) {
  const colors = {
    critical: "bg-rose-50 text-rose-600",
    success: "bg-emerald-50 text-emerald-600",
    primary: "bg-teal-50 text-teal-600",
    warning: "bg-amber-50 text-amber-700",
    ai: "bg-violet-50 text-violet-600",
  };
  return (
    <article className="rr-kpi">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-.045em] text-slate-950">
        <AnimatedMetric value={value} format={format} />
      </p>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">{detail}</p>
    </article>
  );
}

function relativeTime(timestamp: string) {
  const deltaMinutes = Math.round((new Date(timestamp).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
  if (Math.abs(deltaMinutes) < 1_440) return formatter.format(Math.round(deltaMinutes / 60), "hour");
  return formatter.format(Math.round(deltaMinutes / 1_440), "day");
}

function activitySummary(status?: string | null) {
  if (status === "approved") return "Policy validation approved a synthetic recovery path.";
  if (status === "blocked") return "Policy validation retained the safety boundary for this case.";
  if (status === "human_review_required") return "The case was routed to human review by policy.";
  return "A deterministic policy and audit event was recorded.";
}

export default function OperationsDashboard() {
  const [range, setRange] = useState<"7D" | "30D" | "90D" | "12M">("30D");
  const { data: queryData, isLoading, error, refetch, isFetching } = trpc.recovery.dashboard.useQuery(
    { range },
    { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
  );

  const voiceAnalytics = trpc.recovery.voice.analytics.useQuery();
  const demoCustomers = trpc.recovery.voice.listDemoCustomers.useQuery();

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData | null>(null);

  const createSessionMutation = trpc.recovery.voice.createSession.useMutation({
    onSuccess: (res) => {
      setEmailPreviewData(res.emailPreview);
      setEmailModalOpen(true);
      toast.success("Voice recovery session prepared", { description: "Email preview ready to launch customer tab." });
      void refetch();
      void voiceAnalytics.refetch();
    },
    onError: (err) => {
      toast.error("Failed to prepare voice recovery session", { description: err.message });
    },
  });

  const lastSettledDashboard = useRef<{ range: "7D" | "30D" | "90D" | "12M"; data: NonNullable<typeof queryData> } | null>(null);
  if (queryData) lastSettledDashboard.current = { range, data: queryData };
  const settledDashboard = queryData ? { range, data: queryData } : lastSettledDashboard.current;
  const data = settledDashboard?.data;
  const displayedRange = settledDashboard?.range ?? range;
  const isRangeRefreshing = Boolean(data && displayedRange !== range && isFetching);

  if (isLoading && !data) return <DashboardSkeleton />;
  if ((error && !data) || !data)
    return (
      <section className="rr-surface p-8">
        <CircleAlert className="h-8 w-8 text-rose-500" />
        <h1 className="mt-4 text-2xl font-semibold tracking-[-.035em] text-slate-950">Recovery metrics are temporarily unavailable</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          The Supabase-backed dashboard could not be loaded. Refresh the page or verify the server-side database configuration.
        </p>
        <Button onClick={() => refetch()} className="mt-5 rounded-lg">
          Retry dashboard
        </Button>
      </section>
    );

  const activeOpportunities = data.opportunity.high + data.opportunity.medium + data.opportunity.low;
  const insight = data.aiInsight;
  const funnelTop = Math.max(data.funnel[0]?.count ?? 1, 1);

  const voiceMetrics = voiceAnalytics.data?.metrics ?? {
    emailsSent: 2,
    sessionsStarted: 1,
    paymentsOffered: 1,
    paymentsRecovered: 0,
    promisesRecorded: 0,
    declines: 0,
    revenueRecovered: 0,
    conversionRate: 0,
  };

  return (
    <div className="rr-page mx-auto max-w-[1540px] space-y-5 pb-10" aria-busy={isRangeRefreshing}>
      {/* Hero Command Bar */}
      <section className="rr-command-hero relative overflow-hidden rounded-2xl border border-teal-100/70 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 p-6 shadow-xs sm:p-8">
        <div className="rr-command-signal" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Revenue Operations Center</span>
              <span className="text-teal-400">/</span>
              <span className="text-teal-700">Live Autopilot</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl sm:leading-tight">
              Real-Time Operations &amp;{" "}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                Autonomous Revenue Recovery
              </span>
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
              Monitor revenue risk, recovery performance, and policy-controlled AI actions across your business with real-time SSE telemetries.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Deterministic Guardrails
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Hinglish Voice Recovery
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white/90 px-2.5 py-1 font-medium shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" />
                Razorpay Verified Settlement
              </span>
            </div>
            {isRangeRefreshing ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                <span className="rr-execution-spinner h-3 w-3 rounded-full border-2 border-teal-200 border-t-teal-600" />
                Showing {displayedRange} while {range} source data updates
              </p>
            ) : error ? (
              <p className="mt-3 text-[11px] font-semibold text-amber-700">
                Showing the last settled range. Refresh to retry the selected range.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label="Date range"
                value={range}
                onChange={(event) => setRange(event.target.value as "7D" | "30D" | "90D" | "12M")}
                className="bg-transparent outline-none"
              >
                <option>7D</option>
                <option>30D</option>
                <option>90D</option>
                <option>12M</option>
              </select>
            </label>

            <Button
              variant="outline"
              className="h-9 rounded-xl border-slate-200 bg-white text-xs shadow-sm"
              onClick={() => {
                const report = new Blob(
                  [`ReVora Revenue Operations\nSource range: ${displayedRange}\nRevenue at risk: ${data.metrics.revenueAtRisk}\nRecovered: ${data.metrics.recoveredRevenue}\n`],
                  { type: "text/plain" },
                );
                const url = URL.createObjectURL(report);
                const link = document.createElement("a");
                link.href = url;
                link.download = "revora-source-snapshot.txt";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export snapshot
            </Button>

            <Button asChild className="h-9 rounded-xl bg-slate-900 px-3.5 text-xs text-white shadow-sm hover:bg-slate-800">
              <Link href="/simulator">
                <Play className="mr-2 h-3.5 w-3.5" />
                Run recovery scan
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top Core KPIs */}
      <section className="rr-stagger grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Revenue at risk"
          value={data.metrics.revenueAtRisk}
          format={(value) => currency.format(value)}
          detail={`${data.metrics.failedPayments.toLocaleString("en-IN")} failed or pending payments`}
          icon={CircleDollarSign}
          tone="critical"
        />
        <KpiCard
          label="Revenue recovered"
          value={data.metrics.recoveredRevenue + voiceMetrics.revenueRecovered}
          format={(value) => currency.format(value)}
          detail="From successful simulated & voice outcomes"
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Recovery rate"
          value={data.metrics.recoveryRate}
          format={(value) => percent.format(value)}
          detail="Across completed simulated attempts"
          icon={Gauge}
          tone="primary"
        />
        <KpiCard
          label="Active opportunities"
          value={activeOpportunities}
          format={(value) => Math.round(value).toLocaleString("en-IN")}
          detail={`${data.opportunity.high.toLocaleString("en-IN")} high-priority opportunities`}
          icon={ShieldAlert}
          tone="warning"
        />
        <KpiCard
          label="AI actions"
          value={data.activity.length + voiceMetrics.emailsSent}
          format={(value) => Math.round(value).toLocaleString("en-IN")}
          detail="Recent policy, audit, and voice activity"
          icon={Bot}
          tone="ai"
        />
      </section>

      {/* NEW FEATURE: Impact Creator Voice Recovery Channel Section */}
      <section className="rounded-3xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/30 to-emerald-50/20 p-6 sm:p-7 shadow-md space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-teal-100/80 pb-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-lg">
              <Headphones className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Impact Creator: Hinglish Voice Recovery Channel
                </h2>
                <span className="rounded-full bg-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 tracking-wide shadow-sm">
                  ACTIVE CHANNEL
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                ReVora's in-browser voice channel converts payment failure emails into live conversational recovery in Hinglish with Gemini AI. Completes verified checkout via Razorpay Test Mode.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-800 bg-teal-100/70 px-3 py-1.5 rounded-xl border border-teal-200/60">
              Zero Paid Telephony Providers (Web Speech API STT/TTS)
            </span>
          </div>
        </div>

        {/* Voice Channel Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emails Sent</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{voiceMetrics.emailsSent}</p>
            <p className="text-[10px] text-slate-500 mt-1">With AI voice session CTA</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Voice Engaged</p>
            <p className="mt-1 text-2xl font-bold text-teal-800">{voiceMetrics.sessionsStarted}</p>
            <p className="text-[10px] text-teal-600 mt-1">Hinglish speech turns</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Payment Offered</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{voiceMetrics.paymentsOffered ?? 1}</p>
            <p className="text-[10px] text-blue-600 mt-1">Razorpay Test checkouts</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Payments Recovered</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{voiceMetrics.paymentsRecovered}</p>
            <p className="text-[10px] text-emerald-600 mt-1">Gateway verified success</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Voice Recovered Value</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-950">{currency.format(voiceMetrics.revenueRecovered)}</p>
            <p className="text-[10px] text-emerald-700 mt-1">Live state updated</p>
          </div>
        </div>

        {/* Priority Customer Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              Priority At-Risk Accounts (Voice Channel Recommended)
            </p>
            <span className="text-[11px] text-slate-500">Live Recovery Pipeline</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {demoCustomers.data?.map((customer) => {
              return (
                <div
                  key={customer.paymentId}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 text-sm font-bold border border-teal-100">
                        {customer.customerName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{customer.customerName}</h4>
                          <span className="text-[10px] font-semibold text-slate-500">({customer.customerEmail})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Payment: <span className="font-mono font-semibold">{customer.paymentId}</span> · Failure:{" "}
                          <span className="font-medium text-rose-600">{humanize(customer.failureReason)}</span>
                        </p>
                      </div>
                    </div>

                    <StatusPill status={customer.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">At Risk Amount</p>
                      <p className="text-lg font-bold text-slate-950">{currency.format(customer.amount)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/payments/${customer.paymentId}`}>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs">
                          Inspect Payment
                        </Button>
                      </Link>

                      <Button
                        onClick={() => createSessionMutation.mutate({ paymentId: customer.paymentId })}
                        disabled={createSessionMutation.isPending}
                        size="sm"
                        className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                        Send Recovery Email
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recovery Trend and Funnel Section */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <article className="rr-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="rr-eyebrow">Recovery performance</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">Revenue risk and recovery trend</h2>
              <p className="mt-1 text-xs text-slate-500">
                Source-derived trend · {isRangeRefreshing ? `settled ${displayedRange} view` : `${displayedRange} view selected`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-[#ef8a79]" />
                At risk
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-[#0f9488]" />
                Recovered
              </span>
            </div>
          </div>
          <ChartContainer
            config={trendConfig}
            className={`mt-5 h-[285px] w-full aspect-auto transition-opacity ${isRangeRefreshing ? "opacity-80" : "opacity-100"}`}
          >
            <AreaChart data={data.recoveryTrend} margin={{ left: -12, right: 8, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#ef8a79" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#ef8a79" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recoveredFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0f9488" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0f9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#98a2b3" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#98a2b3" }}
                tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency.format(Number(value))} />} />
              <Area type="monotone" dataKey="atRisk" stroke="#ef8a79" strokeWidth={2} fill="url(#riskFill)" />
              <Area type="monotone" dataKey="recovered" stroke="#0f9488" strokeWidth={2} fill="url(#recoveredFill)" />
            </AreaChart>
          </ChartContainer>
        </article>

        <article className="rr-surface p-5 sm:p-6">
          <div>
            <p className="rr-eyebrow">Recovery funnel</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">From detection to recovered</h2>
          </div>
          <div className="mt-5 space-y-3">
            {data.funnel.map((stage, index) => (
              <div key={stage.stage}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{stage.stage}</span>
                  <span className="font-medium text-slate-500">{stage.count.toLocaleString("en-IN")}</span>
                </div>
                <div className="rr-progress-track h-2">
                  <div
                    className="rr-progress-fill"
                    style={{
                      width: `${Math.max(6, Math.round((stage.count / funnelTop) * 100))}%`,
                      opacity: 1 - index * 0.11,
                    }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{currency.format(stage.value)}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Priority Opportunities Table & AI Insight */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rr-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="rr-eyebrow">Revenue at risk</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">Priority opportunities</h2>
            </div>
            <Button variant="ghost" asChild className="h-8 rounded-lg text-xs text-slate-600">
              <Link href="/risk">
                View all risk <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-3 py-3">Risk type</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Probability</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.riskRows.slice(0, 5).map((row) => (
                  <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50" key={row.paymentId}>
                    <td className="px-5 py-3">
                      <Link href={`/payments/${row.paymentId}`} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {row.customerId.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-slate-800">{row.customerId}</span>
                          <span className="block text-[10px] text-slate-400">{row.paymentId}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{humanize(row.riskType)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-slate-800">{currency.format(row.amount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${row.probability * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600">{percent.format(row.probability)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-slate-600">{humanize(row.recommendedAction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rr-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="rr-eyebrow">AI insight</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">Highest-impact signal</h2>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Lightbulb className="h-4 w-4" />
            </span>
          </div>
          {insight ? (
            <>
              <p className="mt-5 text-sm leading-6 text-slate-700">
                <strong>{percent.format(insight.share)}</strong> of current at-risk payments are associated with{" "}
                <strong>{humanize(insight.failureReason)}</strong>, representing{" "}
                <strong>{currency.format(insight.recoverableRevenue)}</strong> in probability-weighted recovery value.
              </p>
              <div className="mt-4 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-800">
                <span className="font-bold">AI guidance:</span> Prioritize the {insight.affectedPayments.toLocaleString("en-IN")}{" "}
                affected payments with policy-approved interventions or Voice Recovery channel in Hinglish.
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="rounded-lg bg-slate-900 text-xs text-white hover:bg-slate-800">
                  <Link href="/payments">View affected payments</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-lg border-slate-200 text-xs">
                  <Link href="/automations">Review policy</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No source-derived insight is available yet.</p>
          )}
        </article>
      </section>

      {/* Recoverable Opportunity Mix & Live Activity */}
      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <article className="rr-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="rr-eyebrow">Recovery opportunity mix</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">Recoverable value by failure signal</h2>
            </div>
            <ListFilter className="h-4 w-4 text-slate-400" />
          </div>
          <ChartContainer config={actionConfig} className="mt-5 h-[235px] w-full aspect-auto">
            <BarChart data={data.failurePerformance.slice(0, 6)} margin={{ left: -12, right: 8, top: 5, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="failureReason" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#98a2b3" }} tickFormatter={(value) => humanize(String(value)).split(" ")[0]} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#98a2b3" }} tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency.format(Number(value))} />} />
              <Bar dataKey="recoverableRevenue" fill="var(--color-recoverableRevenue)" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ChartContainer>
        </article>

        <article className="rr-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="rr-eyebrow">AI recovery agent</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.03em] text-slate-900">Live activity</h2>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
              <i className="rr-agent-active h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Monitoring synthetic revenue events, email triggers, and Hinglish voice recovery interactions.
          </p>
          <div className="mt-4 space-y-2.5">
            {data.activity.slice(0, 4).map((event) => (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3" key={event.id}>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {humanize(event.action ?? event.aiDecision ?? "Policy evaluation")}
                      </p>
                      <StatusPill status={event.policyResult} className="scale-90 origin-right" />
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{activitySummary(event.policyResult)}</p>
                    <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{relativeTime(event.timestamp)}</p>
                  </div>
                </div>
                <details className="mt-2 pl-10 text-[10px] text-slate-500">
                  <summary className="cursor-pointer font-semibold text-slate-600">View details</summary>
                  <p className="mt-1 leading-4">{event.reason ?? event.diagnosis ?? "A deterministic policy decision was recorded."}</p>
                </details>
              </div>
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-3 h-8 rounded-lg px-0 text-xs text-slate-600 hover:bg-transparent hover:text-slate-900">
            <Link href="/activity">
              View all activity <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </article>
      </section>

      {/* Environment Boundary */}
      <EnvironmentStrip className="justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Simulation & Test boundary.</strong> All values use synthetic records. Voice recovery uses browser STT/TTS and Razorpay Test Mode.
          </p>
        </div>
        <button onClick={() => refetch()} className="shrink-0 font-semibold underline underline-offset-2">
          {isFetching ? (isRangeRefreshing ? `Updating ${range}…` : "Refreshing…") : "Refresh source data"}
        </button>
      </EnvironmentStrip>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        emailData={emailPreviewData}
      />
    </div>
  );
}
