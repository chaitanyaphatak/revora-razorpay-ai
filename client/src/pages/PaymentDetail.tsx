import { StatusPill, humanize } from "@/components/recoverai/StatusPill";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Bot,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  Headphones,
  Landmark,
  Mail,
  Mic,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { EmailPreviewModal, type EmailPreviewData } from "@/components/recoverai/EmailPreviewModal";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function PaymentDetail({ params }: { params: { paymentId: string } }) {
  const { data, isLoading, error, refetch } = trpc.recovery.paymentDetail.useQuery({ paymentId: params.paymentId });
  const intelligence = trpc.recovery.intelligence.useQuery({ paymentId: params.paymentId });

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData | null>(null);

  const createSessionMutation = trpc.recovery.voice.createSession.useMutation({
    onSuccess: (res) => {
      setEmailPreviewData(res.emailPreview);
      setEmailModalOpen(true);
      toast.success("Voice recovery session prepared", { description: "Email preview ready to launch customer tab." });
      void refetch();
    },
    onError: (err) => {
      toast.error("Failed to prepare voice recovery session", { description: err.message });
    },
  });

  if (isLoading)
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-slate-100" />
        <div className="h-64 rounded-xl bg-slate-100" />
        <div className="h-72 rounded-xl bg-slate-100" />
      </div>
    );

  if (error || !data)
    return (
      <section className="rr-surface p-8">
        <CircleAlert className="h-8 w-8 text-rose-500" />
        <h1 className="mt-4 text-2xl font-semibold">Payment not found</h1>
        <p className="mt-2 text-sm text-slate-500">This payment may not exist in the synthetic source dataset.</p>
        <Link href="/payments">
          <Button className="mt-5 rounded-lg bg-slate-900 text-white">Back to payments</Button>
        </Link>
      </section>
    );

  const { payment, recoveryCase, actions, auditTimeline, policyDecisions, customerHistory } = data;
  const recommendedCandidate = intelligence.data?.candidates.find((candidate) => candidate.action === intelligence.data?.recommendedAction);
  const expectedRecoveryValue = intelligence.data?.expectedRecoveryValue ?? payment.amount * payment.recoveryProbability;

  const isEligibleForVoice = payment.status === "failed" || payment.status === "pending" || recoveryCase?.recommendation === "voice_recovery";

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <Link href="/payments">
        <Button variant="ghost" className="-ml-3 rounded-lg text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to payments
        </Button>
      </Link>

      <section className="rr-surface border-l-4 border-l-teal-500 p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm font-semibold text-slate-800">{payment.id}</p>
              <StatusPill status={payment.status} />
              {isEligibleForVoice && (
                <span className="rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 flex items-center gap-1">
                  <Mic className="h-3 w-3 text-teal-600" />
                  Voice Recovery Recommended
                </span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-slate-950">
              {currency.format(payment.amount)}{" "}
              <span className={payment.status === "recovered" ? "text-emerald-600" : "text-slate-400"}>
                {payment.status === "recovered" ? "recovered" : "at risk"}
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {payment.paymentMethod.replace(/_/g, " ")} via {payment.gateway} · {dateTime.format(new Date(payment.timestamp))}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {/* Primary Voice Recovery Action */}
              {payment.status !== "recovered" && (
                <Button
                  onClick={() => createSessionMutation.mutate({ paymentId: payment.id })}
                  disabled={createSessionMutation.isPending}
                  className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send Voice Recovery Email (Demo)
                </Button>
              )}

              <Link href="/simulator" className="inline-flex">
                <Button variant="outline" size="sm" className="rounded-lg border-teal-200 bg-white text-teal-800 hover:bg-teal-50">
                  Open What-If lab
                </Button>
              </Link>

              <Link href={`/assistant?paymentId=${encodeURIComponent(payment.id)}`} className="inline-flex">
                <Button variant="outline" size="sm" className="rounded-lg border-violet-200 bg-white text-violet-800 hover:bg-violet-50">
                  <Bot className="mr-1.5 h-3.5 w-3.5" />
                  Ask Assistant
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">Model recovery probability</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-.05em] text-teal-800">
              {Math.round((intelligence.data?.recoveryProbability ?? payment.recoveryProbability) * 100)}%
            </p>
            <p className="mt-1 text-xs text-teal-700">Policy determines any recovery action.</p>
          </div>
        </div>
      </section>

      {/* Voice Recovery Channel Feature Banner */}
      <section className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
              <Headphones className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-teal-950">Impact Creator: Hinglish Voice Recovery Channel</h3>
                <span className="rounded-full bg-teal-100/80 text-teal-800 text-[10px] font-extrabold px-2 py-0.5">
                  NEW CHANNEL
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                When this payment fails, ReVora emails the customer an interactive CTA to speak with an AI recovery assistant in Hinglish. The assistant empathizes, clarifies the issue, and routes to Razorpay Test Mode without exposing credentials.
              </p>
            </div>
          </div>

          {payment.status !== "recovered" && (
            <Button
              onClick={() => createSessionMutation.mutate({ paymentId: payment.id })}
              disabled={createSessionMutation.isPending}
              size="sm"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs shrink-0"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-400" />
              Launch Voice Flow
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rr-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="rr-eyebrow">Recovery intelligence</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">A bounded, explainable recommendation</h2>
            </div>
            <Bot className="h-5 w-5 text-teal-600" />
          </div>

          {recoveryCase ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-teal-900">{humanize(recoveryCase.recommendation)}</p>
                  <StatusPill status={recoveryCase.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {recoveryCase.reasoning ?? "The policy-ready recommendation uses payment context and the model score."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-teal-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Expected recovery value</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-.04em] text-teal-900">{currency.format(expectedRecoveryValue)}</p>
                  <p className="mt-1 text-[11px] text-teal-700">Probability-weighted</p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Model-selected action</p>
                  <p className="mt-1 text-sm font-semibold text-blue-900">
                    {humanize(intelligence.data?.recommendedAction ?? recoveryCase.recommendation)}
                  </p>
                  {recommendedCandidate && (
                    <StatusPill status={recommendedCandidate.policy.result} className="mt-2 scale-90 origin-left" />
                  )}
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diagnosis</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{humanize(recoveryCase.diagnosis)}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Model confidence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{Math.round((recoveryCase.confidence ?? 0.88) * 100)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">There is no recovery case attached to this payment.</p>
          )}
        </section>

        <section className="rr-surface p-5 sm:p-6">
          <div>
            <p className="rr-eyebrow">Customer context</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">History informs the action boundary</h2>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
              <UserRound className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{payment.customerId}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-lg font-semibold">{customerHistory.recentPaymentCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent</p>
              </div>

              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-lg font-semibold text-emerald-700">{customerHistory.successfulPayments}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Succeeded</p>
              </div>

              <div className="rounded-lg border border-slate-100 p-3">
                <p className="text-lg font-semibold text-teal-700">{customerHistory.recoveredPayments}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recovered</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rr-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="rr-eyebrow">Decision record</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Policy ledger</h2>
            </div>
            <ShieldCheck className="h-5 w-5 text-teal-600" />
          </div>

          <div className="mt-5 space-y-3">
            {policyDecisions.length ? (
              policyDecisions.map((decision) => (
                <div className="rounded-xl border border-slate-100 bg-white p-4" key={decision.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{humanize(decision.action)}</p>
                    <StatusPill status={decision.result} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{decision.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1">{decision.ruleCode}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">{dateTime.format(new Date(decision.decisionTimestamp))}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Simulated</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No policy decision has been persisted for this payment yet. A first record appears when a recovery action or voice flow is triggered.
              </div>
            )}
          </div>
        </section>

        <section className="rr-surface p-5 sm:p-6">
          <div>
            <p className="rr-eyebrow">Payment context</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">Operational facts</h2>
          </div>

          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">Failure reason</dt>
              <dd className="font-semibold text-slate-800">{humanize(payment.failureReason)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">Attempt number</dt>
              <dd className="font-semibold text-slate-800">{payment.attemptNumber}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">Recurring</dt>
              <dd className="font-semibold text-slate-800">{payment.isRecurring ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">Merchant category</dt>
              <dd className="font-semibold text-slate-800">{humanize(payment.merchantCategory)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rr-surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="rr-eyebrow">Audit timeline</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em]">What happened, in business terms</h2>
          </div>
          <Clock3 className="h-5 w-5 text-slate-400" />
        </div>

        <div className="mt-5 space-y-0">
          {auditTimeline.length ? (
            auditTimeline.map((event, index) => (
              <div className="relative flex gap-4 pb-5" key={event.id}>
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {index === 0 ? <Sparkles className="h-4 w-4 text-teal-600" /> : <Landmark className="h-4 w-4" />}
                </div>
                {index !== auditTimeline.length - 1 && (
                  <span className="absolute left-4 top-8 h-[calc(100%-1rem)] border-l border-dashed border-slate-200" />
                )}
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{humanize(event.action ?? event.aiDecision)}</p>
                    <StatusPill status={event.executionResult ?? event.policyResult} />
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {event.reason ?? event.diagnosis ?? "Recovery audit event recorded."}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{dateTime.format(new Date(event.timestamp))}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No audit entries are available for this payment.</p>
          )}
        </div>
      </section>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        emailData={emailPreviewData}
      />
    </div>
  );
}
