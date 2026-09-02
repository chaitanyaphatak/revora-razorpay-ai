import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { InitialAvatar } from "@/components/recoverai/DesignPrimitives";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  Headphones,
  Layers3,
  LoaderCircle,
  Mail,
  Mic,
  Play,
  Radar,
  RotateCw,
  Scan,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { EmailPreviewModal, type EmailPreviewData } from "@/components/recoverai/EmailPreviewModal";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 0 });

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="rr-eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-.05em] text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </section>
  );
}

function LoadingSurface() {
  return <div className="rr-skeleton h-64 rounded-2xl" />;
}

export function RiskWorkspace() {
  const { data, isLoading, error, refetch } = trpc.recovery.payments.useQuery({
    page: 1,
    pageSize: 50,
    status: "FAILED",
    sort: "probability_desc",
  });
  const demoCustomers = trpc.recovery.voice.listDemoCustomers.useQuery();

  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanStep, setScanStep] = useState("");

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData | null>(null);

  const createSessionMutation = trpc.recovery.voice.createSession.useMutation({
    onSuccess: (res) => {
      setEmailPreviewData(res.emailPreview);
      setEmailModalOpen(true);
      toast.success("Voice recovery email dispatched via Resend", {
        description: `Sent to ${res.emailPreview.recipientEmail}`,
      });
      void refetch();
    },
    onError: (err) => {
      toast.error("Failed to prepare voice recovery session", { description: err.message });
    },
  });

  const handleRunScan = () => {
    setIsScanning(true);
    setScanStep("Querying failed transactions and telemetries...");

    setTimeout(() => {
      setScanStep("Evaluating Hinglish Voice AI eligibility rules...");
    }, 500);

    setTimeout(() => {
      setScanStep("Ranking highest-yield recovery opportunities...");
    }, 1000);

    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);

      const highPriorityCount = demoCustomers.data?.length ?? 6;
      const totalAtRisk = (demoCustomers.data ?? []).reduce((sum, c) => sum + c.amount, 0) || 35400;
      const totalFailedRecords = data?.total ?? data?.payments?.length ?? 50;

      toast.success("At-risk scan completed", {
        description: `${highPriorityCount} priority accounts detected (${currency.format(totalAtRisk)}) out of ${totalFailedRecords} at-risk records.`,
      });
    }, 1500);
  };

  if (isLoading) return <LoadingSurface />;
  if (error || !data) return <ErrorSurface />;

  return (
    <div className="rr-page mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Revenue risk"
        title="Revenue Risk"
        description="Identify recovery opportunities before they become lost revenue. Scan for high-yield at-risk accounts."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleRunScan}
              disabled={isScanning}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md flex items-center gap-2"
            >
              {isScanning ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Scanning telemetry...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Scan for At-Risk Payments
                </>
              )}
            </Button>

            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white text-xs">
              <Link href="/simulator">
                Run What-If <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* Scanning Active Overlay Animation */}
      {isScanning && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50/90 p-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg">
                <Radar className="h-6 w-6 animate-spin text-teal-100" />
              </span>
              <div>
                <h3 className="text-base font-bold text-teal-950">Running Intelligence Scan</h3>
                <p className="text-xs text-teal-800 mt-0.5">{scanStep}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-ping" />
              <span className="text-xs font-semibold text-teal-900">Live Engine Analysis</span>
            </div>
          </div>

          <div className="rr-progress-track mt-4 h-2 bg-teal-200/60">
            <div className="rr-progress-fill bg-teal-600 animate-pulse w-full duration-1000" />
          </div>
        </section>
      )}

      {/* Scan Results Highlight Banner (Priority At-Risk Accounts) */}
      {hasScanned && (
        <section className="rounded-3xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/20 p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white text-xs font-bold">
                {demoCustomers.data?.length ?? 0}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scan Detected: High-Priority At-Risk Accounts</h3>
                <p className="text-xs text-slate-500">Ranked by model recovery potential & eligible for Voice AI in Hinglish</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 w-fit">
              AI Voice Recommended
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {demoCustomers.data?.map((customer) => (
              <div
                key={customer.paymentId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-400 transition-all flex flex-col justify-between space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 text-sm font-bold border border-teal-100">
                      {customer.customerName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{customer.customerName}</h4>
                      <p className="text-xs text-slate-500">
                        {customer.paymentId} · <span className="font-medium text-rose-600">{humanize(customer.failureReason)}</span>
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
                        Review Details
                      </Button>
                    </Link>

                    <Button
                      onClick={() => createSessionMutation.mutate({ paymentId: customer.paymentId })}
                      disabled={createSessionMutation.isPending}
                      size="sm"
                      className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mini Stats */}
      <section className="rr-stagger grid gap-3 sm:grid-cols-3">
        <MiniStat label="Failed payments" value={data.total.toLocaleString("en-IN")} icon={ShieldAlert} tone="rose" />
        <MiniStat
          label="Priority window"
          value={`${data.payments.filter((payment) => payment.recoveryProbability >= 0.7).length}`}
          icon={Gauge}
          tone="amber"
        />
        <MiniStat label="Shown now" value={`${data.payments.length} records`} icon={ListIcon} tone="blue" />
      </section>

      {/* Ranked Opportunity Queue */}
      <section className="rr-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Ranked opportunity queue</p>
            <p className="mt-1 text-xs text-slate-500">Use a payment detail to inspect deterministic policy and audit history.</p>
          </div>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">Failed payments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Opportunity</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Risk score</th>
                <th className="px-3 py-3">Failure signal</th>
                <th className="px-5 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id} className="rr-table-row border-t border-slate-100">
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-slate-800">{payment.customerId}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{payment.id}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-800">{currency.format(payment.amount)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{Math.round(payment.recoveryProbability * 100)}</span>
                      <div className="rr-progress-track h-1.5 w-16">
                        <div className="rr-progress-fill bg-rose-500" style={{ width: `${payment.recoveryProbability * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">{humanize(payment.failureReason ?? "unknown")}</td>
                  <td className="px-5 py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="rr-row-action h-7 rounded-lg text-xs">
                      <Link href={`/payments/${payment.id}`}>
                        Review <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Email Preview Modal */}
      <EmailPreviewModal open={emailModalOpen} onOpenChange={setEmailModalOpen} emailData={emailPreviewData} />
    </div>
  );
}

export function RecoveryWorkspace() {
  const { data, isLoading, error } = trpc.recovery.operationsCenter.useQuery();
  if (isLoading) return <LoadingSurface />;
  if (error || !data) return <ErrorSurface />;
  const attempts = data.playbooks.reduce((total, item) => total + item.cases, 0);
  const recovered = data.playbooks.reduce((total, item) => total + item.resolved, 0);
  return (
    <div className="rr-page mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Recovery operations"
        title="Recovery Center"
        description="Track every recovery attempt from detection to simulated recovered revenue."
        action={
          <Button asChild className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/control-center">
              Open control center <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <section className="rr-stagger grid gap-3 sm:grid-cols-4">
        <MiniStat label="Recovery cases" value={attempts.toLocaleString("en-IN")} icon={Layers3} tone="blue" />
        <MiniStat label="Resolved cases" value={recovered.toLocaleString("en-IN")} icon={CheckCircle2} tone="green" />
        <MiniStat label="Escalation queue" value={data.escalationQueue.length.toLocaleString("en-IN")} icon={ShieldAlert} tone="amber" />
        <MiniStat label="Policy candidates" value={data.autopilot.eligibleCount.toLocaleString("en-IN")} icon={Sparkles} tone="violet" />
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <article className="rr-surface p-5">
          <p className="rr-eyebrow">Recovery pipeline</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Action-ready playbooks</h2>
          <div className="mt-5 space-y-3">
            {data.playbooks.map((playbook) => (
              <div key={playbook.action} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{humanize(playbook.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {playbook.cases.toLocaleString("en-IN")} cases · {percent.format(playbook.recoveryRate)} resolved
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">{currency.format(playbook.expectedValue)}</p>
                </div>
                <div className="rr-progress-track mt-3 h-1.5">
                  <div className="rr-progress-fill" style={{ width: `${Math.max(4, playbook.recoveryRate * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="rr-surface p-5">
          <p className="rr-eyebrow">Human review</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Escalation queue</h2>
          <div className="mt-5 space-y-3">
            {data.escalationQueue.slice(0, 6).map((item) => (
              <Link href={`/payments/${item.paymentId}`} key={item.caseId} className="block rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-800">{item.customerId}</span>
                  <span className="text-xs font-semibold text-slate-800">{currency.format(item.amount)}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {item.recommendation} · {percent.format(item.probability)} probability
                </p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export function CustomersWorkspace() {
  const { data, isLoading, error } = trpc.recovery.payments.useQuery({
    page: 1,
    pageSize: 100,
    status: "FAILED",
    sort: "probability_desc",
  });
  if (isLoading) return <LoadingSurface />;
  if (error || !data) return <ErrorSurface />;
  const customers = Array.from(
    data.payments
      .reduce((map, payment) => {
        const current = map.get(payment.customerId) ?? {
          id: payment.customerId,
          payments: 0,
          atRisk: 0,
          failures: 0,
          probability: 0,
        };
        current.payments += 1;
        current.atRisk += payment.status === "failed" || payment.status === "pending" ? payment.amount : 0;
        current.failures += payment.status === "failed" ? 1 : 0;
        current.probability = Math.max(current.probability, payment.recoveryProbability);
        map.set(payment.customerId, current);
        return map;
      }, new Map<string, { id: string; payments: number; atRisk: number; failures: number; probability: number }>())
      .values(),
  ).sort((a, b) => b.atRisk - a.atRisk);
  return (
    <div className="rr-page mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Customer intelligence"
        title="Customers"
        description="A data-backed view aggregated from the current highest-priority synthetic payment page. No customer profile data has been fabricated."
      />
      <section className="rr-surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-800">Customer revenue health</p>
          <p className="mt-1 text-xs text-slate-500">Aggregated from {data.payments.length} current payment records.</p>
        </div>
        <div className="divide-y divide-slate-100 md:hidden">
          {customers.slice(0, 30).map((customer) => (
            <article className="p-4" key={customer.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <InitialAvatar value={customer.id} />
                  <span className="text-xs font-semibold text-slate-800">{customer.id}</span>
                </div>
                <StatusPill status={customer.probability >= 0.7 ? "at-risk" : "monitor"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Revenue at risk</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{currency.format(customer.atRisk)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Failed payments</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{customer.failures}</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="rr-row-action mt-3 h-8 rounded-lg px-0 text-xs text-teal-700 hover:bg-transparent hover:text-teal-900">
                <Link href={`/payments?customerId=${customer.id}`}>
                  View matching payments <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-3 py-3 text-right">Revenue at risk</th>
                <th className="px-3 py-3">Failed payments</th>
                <th className="px-3 py-3">Health signal</th>
                <th className="px-5 py-3">Open</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 30).map((customer) => (
                <tr className="rr-table-row border-t border-slate-100" key={customer.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <InitialAvatar value={customer.id} />
                      <span className="text-xs font-semibold text-slate-800">{customer.id}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-semibold text-slate-800">{currency.format(customer.atRisk)}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">{customer.failures}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={customer.probability >= 0.7 ? "at-risk" : "monitor"} />
                  </td>
                  <td className="px-5 py-3">
                    <Button asChild variant="ghost" size="sm" className="rr-row-action h-7 rounded-lg text-xs">
                      <Link href={`/payments?customerId=${customer.id}`}>
                        Payments <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AgentsWorkspace() {
  const { data, isLoading, error } = trpc.recovery.operationsCenter.useQuery();
  if (isLoading) return <LoadingSurface />;
  if (error || !data) return <ErrorSurface />;
  const agents = [
    { title: "Detection Agent", description: "Monitors payment failures and recovery opportunities.", value: data.auditEvents.length, label: "audit events", icon: ShieldAlert, tone: "rose" },
    { title: "Diagnosis Agent", description: "Ranks recovery potential using the selected recovery model.", value: data.playbooks.reduce((sum, item) => sum + item.cases, 0), label: "cases analyzed", icon: Gauge, tone: "blue" },
    { title: "Recovery Agent", description: "Proposes policy-bounded simulated interventions.", value: data.autopilot.activity.length, label: "recent outcomes", icon: Workflow, tone: "green" },
    { title: "Escalation Agent", description: "Routes high-value and review-required cases to people.", value: data.escalationQueue.length, label: "cases queued", icon: Users, tone: "amber" },
  ];
  return (
    <div className="rr-page mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="AI operations"
        title="AI Recovery Agents"
        description="Autonomous intelligence monitors, reasons, and explains recovery opportunities. Deterministic policy remains the decision authority."
        action={
          <Button asChild className="rounded-lg bg-violet-600 text-white hover:bg-violet-700">
            <Link href="/ai-brief">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI brief
            </Link>
          </Button>
        }
      />
      <section className="rr-stagger grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <article className="rr-surface p-5" key={agent.title}>
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <agent.icon className="h-4 w-4" />
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                <i className="rr-agent-active h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <h2 className="mt-5 text-base font-semibold text-slate-900">{agent.title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{agent.description}</p>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <span className="text-xl font-semibold tracking-[-.04em] text-slate-900">{agent.value.toLocaleString("en-IN")}</span>
              <span className="ml-2 text-xs text-slate-500">{agent.label}</span>
            </div>
          </article>
        ))}
      </section>
      <section className="rr-surface p-5">
        <p className="rr-eyebrow">Latest agent activity</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.autopilot.activity.slice(0, 6).map((item, index) => (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3" key={`${item.paymentId}-${index}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">{item.action}</span>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{item.message ?? `Policy-controlled simulated action for ${item.paymentId}.`}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  tone: "rose" | "green" | "blue" | "amber" | "violet";
}) {
  const tones = {
    rose: "bg-rose-50 text-rose-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <article className="rr-kpi">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 text-xl font-semibold tracking-[-.04em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </article>
  );
}

function ErrorSurface() {
  return (
    <section className="rr-surface p-8">
      <CircleAlert className="h-7 w-7 text-rose-500" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Workspace data is temporarily unavailable</h1>
      <p className="mt-2 text-sm text-slate-500">Refresh the page to retry the public synthetic-data source.</p>
    </section>
  );
}

const ListIcon = Layers3;
