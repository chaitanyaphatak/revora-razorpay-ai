import { getPolicyDecisionsForPayment } from "./policyData.js";
import { getInvoiceDashboard, getReceivablesAnalytics } from "./invoiceData.js";
import { getDemoPayment, listDemoCustomers, getVoiceRecoverySessionByPayment } from "./voiceRecoveryStore.js";

type SupabasePayment = {
  id: number;
  payment_id: string;
  customer_id: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  gateway: string;
  status: string;
  failure_reason: string | null;
  attempt_number: number;
  previous_failures: number;
  customer_success_history: number | string | null;
  timestamp: string;
  merchant_category: string | null;
  customer_tenure: number | null;
  device_type: string | null;
  country: string | null;
  hour_of_day: number | null;
  is_recurring_payment: boolean | null;
  days_since_last_success: number | null;
  recoverable: boolean | null;
  recovery_probability: number | string | null;
  recovery_status: string | null;
  created_at: string;
};

type SupabaseRecoveryCase = {
  id: number;
  payment_id: string;
  recovery_probability: number | string | null;
  ai_recommendation: string | null;
  confidence: number | string | null;
  case_status: string;
  diagnosis: string | null;
  reasoning: string | null;
  created_at: string;
  reviewed_by: string | null;
  human_decision: string | null;
  reviewed_at: string | null;
};

type SupabaseRecoveryAction = {
  id: number;
  payment_id: string;
  action_type: string;
  execution_status: string;
  amount_recovered: number | string;
  executed_at: string | null;
  message: string | null;
};

type SupabaseAuditLog = {
  id: number;
  payment_id: string;
  ai_decision: string | null;
  diagnosis: string | null;
  recovery_probability: number | string | null;
  confidence: number | string | null;
  policy_result: string | null;
  action: string | null;
  execution_result: string | null;
  amount_recovered: number | string;
  reason: string | null;
  timestamp: string;
};

export type NormalizedPayment = {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway: string;
  status: "succeeded" | "failed" | "recovered" | "pending" | "unknown";
  failureReason: string | null;
  attemptNumber: number;
  previousFailures: number;
  recoveryProbability: number;
  recoveryConfidence: number | null;
  recoverable: boolean;
  recoveryStatus: string | null;
  timestamp: string;
  merchantCategory: string | null;
  customerTenure: number | null;
  deviceType: string | null;
  country: string | null;
  isRecurring: boolean;
  daysSinceLastSuccess: number | null;
  customerSuccessHistory: number | null;
};

export type NormalizedRecoveryCase = {
  id: number;
  paymentId: string;
  recoveryProbability: number | null;
  recommendation: string | null;
  confidence: number | null;
  status: string;
  diagnosis: string | null;
  reasoning: string | null;
  createdAt: string;
  reviewedBy: string | null;
  humanDecision: string | null;
  reviewedAt: string | null;
};

export type NormalizedRecoveryAction = {
  id: number;
  paymentId: string;
  actionType: string;
  executionStatus: string;
  amountRecovered: number;
  executedAt: string | null;
  message: string | null;
};

export type NormalizedAuditEvent = {
  id: number;
  paymentId: string;
  aiDecision: string | null;
  diagnosis: string | null;
  recoveryProbability: number | null;
  confidence: number | null;
  policyResult: string | null;
  action: string | null;
  executionResult: string | null;
  amountRecovered: number;
  reason: string | null;
  timestamp: string;
};

export type PaymentFilters = {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  status?: string;
  failureReason?: string;
  paymentMethod?: string;
  sort?: "newest" | "oldest" | "amount_desc" | "probability_desc";
};

const MAX_PAGE_SIZE = 100;
const allowedSorts = {
  newest: "timestamp.desc",
  oldest: "timestamp.asc",
  amount_desc: "amount.desc",
  probability_desc: "recovery_probability.desc",
} as const;

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

export function normalizeFraction(value: string | number | null | undefined) {
  const numberValue = toNumber(value);
  if (numberValue === null) return null;
  if (numberValue <= 1) return Math.max(0, Math.min(1, numberValue));
  return Math.max(0, Math.min(1, numberValue / 100));
}

export function normalizePaymentStatus(value: string | null | undefined): NormalizedPayment["status"] {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "SUCCEEDED" || normalized === "SUCCESS") return "succeeded";
  if (normalized === "FAILED" || normalized === "FAILURE") return "failed";
  if (normalized === "RECOVERED") return "recovered";
  if (normalized === "PENDING" || normalized === "PROCESSING") return "pending";
  return "unknown";
}

function normalizeOperationalStatus(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[_\s]+/g, "-") ?? null;
}

export function normalizePayment(record: SupabasePayment): NormalizedPayment {
  return {
    id: record.payment_id,
    customerId: record.customer_id,
    amount: toNumber(record.amount) ?? 0,
    currency: record.currency,
    paymentMethod: record.payment_method,
    gateway: record.gateway,
    status: normalizePaymentStatus(record.status),
    failureReason: record.failure_reason,
    attemptNumber: record.attempt_number,
    previousFailures: record.previous_failures,
    recoveryProbability: normalizeFraction(record.recovery_probability) ?? 0,
    recoveryConfidence: null,
    recoverable: Boolean(record.recoverable),
    recoveryStatus: normalizeOperationalStatus(record.recovery_status),
    timestamp: record.timestamp,
    merchantCategory: record.merchant_category,
    customerTenure: record.customer_tenure,
    deviceType: record.device_type,
    country: record.country,
    isRecurring: Boolean(record.is_recurring_payment),
    daysSinceLastSuccess: record.days_since_last_success,
    customerSuccessHistory: normalizeFraction(record.customer_success_history),
  };
}

function normalizeRecoveryCase(record: SupabaseRecoveryCase): NormalizedRecoveryCase {
  return {
    id: record.id,
    paymentId: record.payment_id,
    recoveryProbability: normalizeFraction(record.recovery_probability),
    recommendation: record.ai_recommendation,
    confidence: normalizeFraction(record.confidence),
    status: normalizeOperationalStatus(record.case_status) ?? "unknown",
    diagnosis: record.diagnosis,
    reasoning: record.reasoning,
    createdAt: record.created_at,
    reviewedBy: record.reviewed_by,
    humanDecision: record.human_decision,
    reviewedAt: record.reviewed_at,
  };
}

function normalizeRecoveryAction(record: SupabaseRecoveryAction): NormalizedRecoveryAction {
  return {
    id: record.id,
    paymentId: record.payment_id,
    actionType: record.action_type,
    executionStatus: normalizeOperationalStatus(record.execution_status) ?? "unknown",
    amountRecovered: toNumber(record.amount_recovered) ?? 0,
    executedAt: record.executed_at,
    message: record.message,
  };
}

function normalizeAuditEvent(record: SupabaseAuditLog): NormalizedAuditEvent {
  return {
    id: record.id,
    paymentId: record.payment_id,
    aiDecision: record.ai_decision,
    diagnosis: record.diagnosis,
    recoveryProbability: normalizeFraction(record.recovery_probability),
    confidence: normalizeFraction(record.confidence),
    policyResult: normalizeOperationalStatus(record.policy_result),
    action: record.action,
    executionResult: normalizeOperationalStatus(record.execution_result),
    amountRecovered: toNumber(record.amount_recovered) ?? 0,
    reason: record.reason,
    timestamp: record.timestamp,
  };
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("ReVora Supabase server credentials are not configured.");
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

function parseTotal(response: Response) {
  const contentRange = response.headers.get("content-range");
  const total = contentRange?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

async function requestSupabase<T>(path: string, options?: { count?: boolean; range?: [number, number] }) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
  if (options?.count) headers.Prefer = "count=exact";
  if (options?.range) {
    headers["Range-Unit"] = "items";
    headers.Range = `${options.range[0]}-${options.range[1]}`;
  }
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Supabase read failed with ${response.status}.`);
  }
  const data = await response.json() as T;
  return { data, total: options?.count ? parseTotal(response) : undefined };
}

async function fetchAll<T>(path: string, batchSize = 1_000) {
  const first = await requestSupabase<T[]>(path, { count: true, range: [0, batchSize - 1] });
  const total = first.total ?? first.data.length;
  if (first.data.length === 0 || first.data.length >= total) return first.data;
  const remainingStarts: number[] = [];
  for (let start = batchSize; start < total; start += batchSize) remainingStarts.push(start);
  const remaining = await Promise.all(
    remainingStarts.map((start) => requestSupabase<T[]>(path, { range: [start, start + batchSize - 1] })),
  );
  return first.data.concat(...remaining.map((page) => page.data));
}

function escapeFilterValue(value: string) {
  return value.replace(/[,*()]/g, "").trim();
}

function buildPaymentQuery(filters: PaymentFilters) {
  const params = new URLSearchParams({
    select: "*",
    order: allowedSorts[filters.sort ?? "newest"],
    limit: String(Math.min(MAX_PAGE_SIZE, filters.pageSize)),
    offset: String(Math.max(0, (filters.page - 1) * filters.pageSize)),
  });
  if (filters.status) params.set("status", `eq.${escapeFilterValue(filters.status).toUpperCase()}`);
  if (filters.failureReason) params.set("failure_reason", `eq.${escapeFilterValue(filters.failureReason)}`);
  if (filters.paymentMethod) params.set("payment_method", `eq.${escapeFilterValue(filters.paymentMethod)}`);
  if (filters.search) params.set("payment_id", `ilike.*${escapeFilterValue(filters.search)}*`);
  if (filters.customerId) params.set("customer_id", `eq.${escapeFilterValue(filters.customerId).toUpperCase()}`);
  return `payments?${params.toString()}`;
}

export async function listPayments(filters: PaymentFilters) {
  const pageSize = Math.min(MAX_PAGE_SIZE, filters.pageSize);
  const result = await requestSupabase<SupabasePayment[]>(buildPaymentQuery({ ...filters, pageSize }), { count: true });
  const normalized = result.data.map(normalizePayment);

  // If on page 1, include demo payments if they match the filters
  if (filters.page === 1) {
    const demoItems = listDemoCustomers().map((c) => getDemoPayment(c.paymentId)!).filter(Boolean);
    for (const demo of demoItems) {
      const matchesSearch = !filters.search || demo.id.toLowerCase().includes(filters.search.toLowerCase()) || demo.customerId.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = !filters.status || demo.status.toLowerCase() === filters.status.toLowerCase();
      if (matchesSearch && matchesStatus && !normalized.some((p) => p.id === demo.id)) {
        normalized.unshift(demo);
      }
    }
  }

  return {
    payments: normalized,
    page: filters.page,
    pageSize,
    total: (result.total ?? 0) + (filters.page === 1 ? 2 : 0),
  };
}

export async function getPaymentDetail(paymentId: string) {
  const safePaymentId = escapeFilterValue(paymentId);

  // Check demo customer payments first
  const demoPayment = getDemoPayment(safePaymentId);
  if (demoPayment) {
    const session = getVoiceRecoverySessionByPayment(safePaymentId);
    const policyDecisions = await getPolicyDecisionsForPayment(safePaymentId).catch(() => []);
    const demoCustomer = listDemoCustomers().find((c) => c.paymentId === safePaymentId);

    const demoCase: NormalizedRecoveryCase = {
      id: 99991,
      paymentId: safePaymentId,
      recoveryProbability: demoPayment.recoveryProbability,
      recommendation: "voice_recovery",
      confidence: 0.88,
      status: demoPayment.status === "recovered" ? "recovered" : session ? session.status : "voice_recommended",
      diagnosis: `Hinglish Voice Recovery recommended for ${demoCustomer?.customerName ?? "Customer"} (Amount: ₹${demoPayment.amount}, Reason: ${demoPayment.failureReason?.replace(/_/g, " ")}).`,
      reasoning: `AI Recovery Engine evaluated customer profile (${demoCustomer?.notes ?? "High intent customer"}). High propensity for recovery via conversational voice channel with alternative payment routing.`,
      createdAt: demoPayment.timestamp,
      reviewedBy: null,
      humanDecision: null,
      reviewedAt: null,
    };

    const demoAuditTimeline = [
      {
        id: 10001,
        paymentId: safePaymentId,
        aiDecision: "voice_recovery",
        diagnosis: "Payment failure detected (UPI timeout / limit).",
        recoveryProbability: demoPayment.recoveryProbability,
        confidence: 0.88,
        policyResult: "approved",
        action: "recommend_voice_recovery",
        executionResult: "success",
        amountRecovered: demoPayment.status === "recovered" ? demoPayment.amount : 0,
        reason: `ReVora recovery rules engine recommended Voice Recovery in Hinglish for ${demoCustomer?.customerName ?? "Customer"}.`,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    if (session) {
      demoAuditTimeline.push({
        id: 10002,
        paymentId: safePaymentId,
        aiDecision: "voice_recovery",
        diagnosis: "Voice recovery email sent.",
        recoveryProbability: demoPayment.recoveryProbability,
        confidence: 0.88,
        policyResult: "approved",
        action: "send_recovery_email",
        executionResult: "success",
        amountRecovered: session.recoveredAmount,
        reason: `Customer recovery email sent to ${session.customerEmail}. Session status: ${session.status}.`,
        timestamp: session.startedAt,
      });

      if (session.status === "recovered") {
        demoAuditTimeline.push({
          id: 10003,
          paymentId: safePaymentId,
          aiDecision: "voice_recovery",
          diagnosis: "Razorpay Test payment successful.",
          recoveryProbability: 1.0,
          confidence: 1.0,
          policyResult: "approved",
          action: "payment_completed",
          executionResult: "success",
          amountRecovered: session.recoveredAmount,
          reason: `Customer ${session.customerName} completed payment of ₹${session.amount} via Razorpay Test Mode (${session.paymentReference}).`,
          timestamp: session.endedAt ?? new Date().toISOString(),
        });
      }
    }

    return {
      payment: demoPayment,
      recoveryCase: demoCase,
      actions: session
        ? [
            {
              id: 9001,
              paymentId: safePaymentId,
              actionType: "voice_recovery",
              executionStatus: session.status,
              amountRecovered: session.recoveredAmount,
              executedAt: session.startedAt,
              message: `Hinglish Voice Recovery Session (${session.sessionId}). Outcome: ${session.outcome ?? session.status}.`,
            },
          ]
        : [],
      policyDecisions,
      auditTimeline: demoAuditTimeline,
      customerHistory: {
        recentPaymentCount: 3,
        successfulPayments: 2,
        recoveredPayments: demoPayment.status === "recovered" ? 1 : 0,
      },
    };
  }

  const paymentResult = await requestSupabase<SupabasePayment[]>(`payments?payment_id=eq.${encodeURIComponent(safePaymentId)}&select=*`);
  const payment = paymentResult.data[0];
  if (!payment) return null;

  const [caseResult, actionResult, auditResult, policyDecisions, historyResult] = await Promise.all([
    requestSupabase<SupabaseRecoveryCase[]>(`recovery_cases?payment_id=eq.${encodeURIComponent(safePaymentId)}&select=*&limit=1`),
    requestSupabase<SupabaseRecoveryAction[]>(`recovery_actions?payment_id=eq.${encodeURIComponent(safePaymentId)}&select=*&order=executed_at.desc`),
    requestSupabase<SupabaseAuditLog[]>(`audit_logs?payment_id=eq.${encodeURIComponent(safePaymentId)}&select=*&order=timestamp.asc`),
    getPolicyDecisionsForPayment(safePaymentId),
    requestSupabase<SupabasePayment[]>(`payments?customer_id=eq.${encodeURIComponent(payment.customer_id)}&select=payment_id,status,recovery_probability,timestamp&order=timestamp.desc&limit=20`),
  ]);

  const normalizedCase = caseResult.data[0] ? normalizeRecoveryCase(caseResult.data[0]) : null;
  return {
    payment: { ...normalizePayment(payment), recoveryConfidence: normalizedCase?.confidence ?? null },
    recoveryCase: normalizedCase,
    actions: actionResult.data.map(normalizeRecoveryAction),
    policyDecisions,
    auditTimeline: auditResult.data.map(normalizeAuditEvent),
    customerHistory: {
      recentPaymentCount: historyResult.data.length,
      successfulPayments: historyResult.data.filter((item) => normalizePaymentStatus(item.status) === "succeeded").length,
      recoveredPayments: historyResult.data.filter((item) => normalizePaymentStatus(item.status) === "recovered").length,
    },
  };
}

export async function getPaymentById(paymentId: string) {
  const detail = await getPaymentDetail(paymentId);
  return detail?.payment ?? null;
}

type DashboardSource = {
  paymentRows: SupabasePayment[];
  caseRows: SupabaseRecoveryCase[];
  actionRows: SupabaseRecoveryAction[];
  auditRows: SupabaseAuditLog[];
  invoiceDashboard: Awaited<ReturnType<typeof getInvoiceDashboard>>;
};

const dashboardSourceCacheTtlMs = 60_000;
let dashboardSourceCache: { expiresAt: number; value: DashboardSource } | null = null;
let dashboardSourceRequest: Promise<DashboardSource> | null = null;

export function invalidateDashboardOverviewCache() {
  dashboardSourceCache = null;
}

async function getDashboardSource() {
  const now = Date.now();
  if (dashboardSourceCache && dashboardSourceCache.expiresAt > now) return dashboardSourceCache.value;
  if (dashboardSourceRequest) return dashboardSourceRequest;
  dashboardSourceRequest = Promise.all([
    fetchAll<SupabasePayment>("payments?select=*"),
    fetchAll<SupabaseRecoveryCase>("recovery_cases?select=*"),
    fetchAll<SupabaseRecoveryAction>("recovery_actions?select=*"),
    fetchAll<SupabaseAuditLog>("audit_logs?select=*&order=timestamp.desc"),
    getInvoiceDashboard(),
  ]).then(([paymentRows, caseRows, actionRows, auditRows, invoiceDashboard]) => {
    const value = { paymentRows, caseRows, actionRows, auditRows, invoiceDashboard };
    dashboardSourceCache = { value, expiresAt: Date.now() + dashboardSourceCacheTtlMs };
    return value;
  }).finally(() => {
    dashboardSourceRequest = null;
  });
  return dashboardSourceRequest;
}

export async function getDashboardOverview(range: "7D" | "30D" | "90D" | "12M" = "30D") {
  const { paymentRows, caseRows, actionRows, auditRows, invoiceDashboard } = await getDashboardSource();
  const allPayments = paymentRows.map(normalizePayment);
  const allRecoveryCases = caseRows.map(normalizeRecoveryCase);
  const allActions = actionRows.map(normalizeRecoveryAction);
  const allAudits = auditRows.map(normalizeAuditEvent);
  const anchor = Math.max(...allPayments.map(payment => new Date(payment.timestamp).getTime()).filter(Number.isFinite), Date.now());
  const days = { "7D": 7, "30D": 30, "90D": 90, "12M": 365 }[range];
  const start = anchor - days * 86_400_000;
  const isInRange = (timestamp: string | null | undefined) => timestamp ? new Date(timestamp).getTime() >= start : false;
  const payments = allPayments.filter(payment => isInRange(payment.timestamp));
  const recoveryCases = allRecoveryCases.filter(item => isInRange(item.createdAt));
  const actions = allActions.filter(item => isInRange(item.executedAt));
  const audits = allAudits.filter(item => isInRange(item.timestamp));
  const paymentsAtRisk = payments.filter((payment) => payment.status === "failed" || payment.status === "pending");
  const recoveredActions = actions.filter((action) => action.executionStatus === "success");
  const revenueAtRisk = paymentsAtRisk.reduce((total, payment) => total + payment.amount, 0);
  const recoverableRevenue = paymentsAtRisk.reduce((total, payment) => total + payment.amount * payment.recoveryProbability, 0);
  const recoveredRevenue = recoveredActions.reduce((total, action) => total + action.amountRecovered, 0);
  const completedOutcomes = actions.filter((action) => ["success", "failed"].includes(action.executionStatus));
  const highOpportunity = paymentsAtRisk.filter((payment) => payment.recoveryProbability >= 0.75).length;
  const mediumOpportunity = paymentsAtRisk.filter((payment) => payment.recoveryProbability >= 0.5 && payment.recoveryProbability < 0.75).length;
  const lowOpportunity = paymentsAtRisk.filter((payment) => payment.recoveryProbability < 0.5).length;

  const failurePerformance = Object.values(paymentsAtRisk.reduce<Record<string, { failureReason: string; payments: number; recoverableRevenue: number }>>((groups, payment) => {
    const failureReason = payment.failureReason ?? "unknown";
    const group = groups[failureReason] ?? { failureReason, payments: 0, recoverableRevenue: 0 };
    group.payments += 1;
    group.recoverableRevenue += payment.amount * payment.recoveryProbability;
    groups[failureReason] = group;
    return groups;
  }, {})).sort((first, second) => second.recoverableRevenue - first.recoverableRevenue);

  const recoveryCaseByPayment = new Map(recoveryCases.map(item => [item.paymentId, item]));
  const riskRows = [...paymentsAtRisk].sort((first, second) => (second.amount * second.recoveryProbability) - (first.amount * first.recoveryProbability)).slice(0, 8).map(payment => {
    const recoveryCase = recoveryCaseByPayment.get(payment.id);
    return {
      paymentId: payment.id,
      customerId: payment.customerId,
      riskType: payment.failureReason ?? "payment_failure",
      amount: payment.amount,
      probability: payment.recoveryProbability,
      recommendedAction: recoveryCase?.recommendation ?? "escalate_to_human",
      status: recoveryCase?.status ?? payment.recoveryStatus ?? "recovery_pending",
      timestamp: payment.timestamp,
    };
  });
  const bucketByPeriod = (timestamp: string) => {
    const date = new Date(timestamp);
    const daily = range === "7D" || range === "30D";
    return {
      key: daily ? date.toISOString().slice(0, 10) : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", daily ? { day: "2-digit", month: "short" } : { month: "short", year: "2-digit" }),
    };
  };
  const trendMap = new Map<string, { period: string; sortKey: string; atRisk: number; recovered: number; attempts: number }>();
  paymentsAtRisk.forEach(payment => {
    const period = bucketByPeriod(payment.timestamp);
    const current = trendMap.get(period.key) ?? { period: period.label, sortKey: period.key, atRisk: 0, recovered: 0, attempts: 0 };
    current.atRisk += payment.amount;
    trendMap.set(period.key, current);
  });
  actions.forEach(action => {
    const period = bucketByPeriod(action.executedAt ?? new Date(anchor).toISOString());
    const current = trendMap.get(period.key) ?? { period: period.label, sortKey: period.key, atRisk: 0, recovered: 0, attempts: 0 };
    current.attempts += 1;
    if (action.executionStatus === "success") current.recovered += action.amountRecovered;
    trendMap.set(period.key, current);
  });
  const recoveryTrend = Array.from(trendMap.values()).sort((first, second) => first.sortKey.localeCompare(second.sortKey)).slice(-(range === "7D" ? 7 : range === "30D" ? 30 : 12)).map(({ sortKey: _sortKey, ...period }) => period);
  const funnel = [
    { stage: "Detected", count: paymentsAtRisk.length, value: revenueAtRisk },
    { stage: "Diagnosed", count: recoveryCases.length, value: recoverableRevenue },
    { stage: "Intervention selected", count: recoveryCases.filter(item => Boolean(item.recommendation)).length, value: recoverableRevenue },
    { stage: "Recovery attempted", count: actions.length, value: actions.reduce((total, action) => total + (action.executionStatus === "success" ? action.amountRecovered : 0), 0) },
    { stage: "Recovered", count: recoveredActions.length, value: recoveredRevenue },
  ];
  const primaryFailure = failurePerformance[0];
  const primaryFailureShare = paymentsAtRisk.length && primaryFailure ? primaryFailure.payments / paymentsAtRisk.length : 0;

  return {
    metrics: {
      totalPayments: payments.length,
      failedPayments: paymentsAtRisk.length,
      revenueAtRisk,
      recoverableRevenue,
      recoveredRevenue: recoveredRevenue + invoiceDashboard.metrics.recoveredAmount,
      paymentRecoveredRevenue: recoveredRevenue,
      invoiceRecoveredRevenue: invoiceDashboard.metrics.recoveredAmount,
      invoiceOutstandingAmount: invoiceDashboard.metrics.outstandingAmount,
      recoveryRate: completedOutcomes.length ? recoveredActions.length / completedOutcomes.length : 0,
      automationRate: recoveryCases.length ? recoveryCases.filter((item) => item.status === "autopilot-eligible").length / recoveryCases.length : 0,
      humanEscalations: recoveryCases.filter((item) => item.status.includes("human") || item.status.includes("review")).length,
    },
    opportunity: { high: highOpportunity, medium: mediumOpportunity, low: lowOpportunity },
    failurePerformance,
    activity: audits.slice(0, 10),
    recoveryTrend,
    funnel,
    riskRows,
    aiInsight: primaryFailure ? {
      failureReason: primaryFailure.failureReason,
      share: primaryFailureShare,
      recoverableRevenue: primaryFailure.recoverableRevenue,
      affectedPayments: primaryFailure.payments,
    } : null,
  };
}

const analyticsLabel = (value: string | null | undefined, fallback = "Unspecified") => (value ?? fallback).replace(/[_-]/g, " ").replace(/\b\w/g, character => character.toUpperCase());

export async function getAnalyticsOverview(range: "7D" | "30D" | "90D" | "12M" = "30D") {
  const [{ paymentRows, caseRows, actionRows, auditRows }, receivables] = await Promise.all([
    getDashboardSource(),
    getReceivablesAnalytics(),
  ]);
  const allPayments = paymentRows.map(normalizePayment);
  const recoveryCases = caseRows.map(normalizeRecoveryCase);
  const actions = actionRows.map(normalizeRecoveryAction);
  const audits = auditRows.map(normalizeAuditEvent);
  const anchor = Math.max(...allPayments.map(payment => new Date(payment.timestamp).getTime()).filter(Number.isFinite), Date.now());
  const days = { "7D": 7, "30D": 30, "90D": 90, "12M": 365 }[range];
  const start = anchor - days * 86_400_000;
  const isInRange = (timestamp: string | null | undefined) => timestamp ? new Date(timestamp).getTime() >= start : false;
  const payments = allPayments.filter(payment => isInRange(payment.timestamp));
  const paymentsAtRisk = payments.filter(payment => payment.status === "failed" || payment.status === "pending");
  const scopedCases = recoveryCases.filter(item => isInRange(item.createdAt));
  const scopedActions = actions.filter(item => isInRange(item.executedAt));
  const scopedAudits = audits.filter(item => isInRange(item.timestamp));
  const paymentById = new Map(allPayments.map(payment => [payment.id, payment]));
  const revenueAtRisk = paymentsAtRisk.reduce((sum, payment) => sum + payment.amount, 0);
  const expectedRecoveryValue = paymentsAtRisk.reduce((sum, payment) => sum + payment.amount * payment.recoveryProbability, 0);
  const atRiskPaymentIds = new Set(paymentsAtRisk.map(payment => payment.id));
  const coveredAtRiskPaymentIds = new Set(scopedCases.filter(item => atRiskPaymentIds.has(item.paymentId)).map(item => item.paymentId));
  const successfulActions = scopedActions.filter(action => action.executionStatus === "success");
  const completedActions = scopedActions.filter(action => ["success", "failed"].includes(action.executionStatus));
  const observedRecoveredRevenue = successfulActions.reduce((sum, action) => sum + action.amountRecovered, 0);
  const auditedPolicyEvents = scopedAudits.filter(event => Boolean(event.policyResult));
  const approvedPolicyEvents = auditedPolicyEvents.filter(event => event.policyResult === "approved");

  const failureExposure = Object.values(paymentsAtRisk.reduce<Record<string, { failureReason: string; count: number; atRiskAmount: number; expectedRecoveryValue: number }>>((groups, payment) => {
    const failureReason = payment.failureReason ?? "unknown";
    const current = groups[failureReason] ?? { failureReason, count: 0, atRiskAmount: 0, expectedRecoveryValue: 0 };
    current.count += 1;
    current.atRiskAmount += payment.amount;
    current.expectedRecoveryValue += payment.amount * payment.recoveryProbability;
    groups[failureReason] = current;
    return groups;
  }, {})).sort((first, second) => second.expectedRecoveryValue - first.expectedRecoveryValue).map(item => ({ ...item, label: analyticsLabel(item.failureReason), concentration: expectedRecoveryValue ? item.expectedRecoveryValue / expectedRecoveryValue : 0 }));

  const propensityDefinitions = [
    { label: "0–49%", matches: (probability: number) => probability < 0.5 },
    { label: "50–74%", matches: (probability: number) => probability >= 0.5 && probability < 0.75 },
    { label: "75–100%", matches: (probability: number) => probability >= 0.75 },
  ];
  const propensityBands = propensityDefinitions.map(group => {
    const matching = paymentsAtRisk.filter(payment => group.matches(payment.recoveryProbability));
    return { label: group.label, count: matching.length, atRiskAmount: matching.reduce((sum, payment) => sum + payment.amount, 0), expectedRecoveryValue: matching.reduce((sum, payment) => sum + payment.amount * payment.recoveryProbability, 0) };
  });

  const actionMap = new Map<string, { action: string; caseCount: number; expectedRecoveryValue: number; simulatedRuns: number; successfulRuns: number; observedRecoveredRevenue: number }>();
  const actionAggregate = (action: string) => {
    const key = action || "do_nothing";
    const current = actionMap.get(key) ?? { action: key, caseCount: 0, expectedRecoveryValue: 0, simulatedRuns: 0, successfulRuns: 0, observedRecoveredRevenue: 0 };
    actionMap.set(key, current);
    return current;
  };
  scopedCases.forEach(item => {
    const current = actionAggregate(item.recommendation ?? "do_nothing");
    const payment = paymentById.get(item.paymentId);
    current.caseCount += 1;
    current.expectedRecoveryValue += (payment?.amount ?? 0) * (item.recoveryProbability ?? payment?.recoveryProbability ?? 0);
  });
  scopedActions.forEach(item => {
    const current = actionAggregate(item.actionType);
    current.simulatedRuns += 1;
    if (item.executionStatus === "success") {
      current.successfulRuns += 1;
      current.observedRecoveredRevenue += item.amountRecovered;
    }
  });
  const actionPerformance = Array.from(actionMap.values()).map(item => ({ ...item, label: analyticsLabel(item.action), observedSuccessRate: item.simulatedRuns ? item.successfulRuns / item.simulatedRuns : null })).sort((first, second) => second.expectedRecoveryValue - first.expectedRecoveryValue);

  const policyMap = new Map<string, { status: string; count: number; recoveredAmount: number }>();
  auditedPolicyEvents.forEach(event => {
    const status = event.policyResult ?? "unclassified";
    const current = policyMap.get(status) ?? { status, count: 0, recoveredAmount: 0 };
    current.count += 1;
    current.recoveredAmount += event.amountRecovered;
    policyMap.set(status, current);
  });
  const policyDistribution = Array.from(policyMap.values()).map(item => ({ ...item, label: analyticsLabel(item.status), share: auditedPolicyEvents.length ? item.count / auditedPolicyEvents.length : 0 })).sort((first, second) => second.count - first.count);

  const bucketByPeriod = (timestamp: string) => {
    const date = new Date(timestamp);
    const daily = range === "7D" || range === "30D";
    return {
      key: daily ? date.toISOString().slice(0, 10) : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", daily ? { day: "2-digit", month: "short" } : { month: "short", year: "2-digit" }),
    };
  };
  const trendMap = new Map<string, { period: string; sortKey: string; atRiskAmount: number; expectedRecoveryValue: number; observedRecoveredRevenue: number }>();
  paymentsAtRisk.forEach(payment => {
    const period = bucketByPeriod(payment.timestamp);
    const current = trendMap.get(period.key) ?? { period: period.label, sortKey: period.key, atRiskAmount: 0, expectedRecoveryValue: 0, observedRecoveredRevenue: 0 };
    current.atRiskAmount += payment.amount;
    current.expectedRecoveryValue += payment.amount * payment.recoveryProbability;
    trendMap.set(period.key, current);
  });
  successfulActions.forEach(action => {
    const period = bucketByPeriod(action.executedAt ?? new Date(anchor).toISOString());
    const current = trendMap.get(period.key) ?? { period: period.label, sortKey: period.key, atRiskAmount: 0, expectedRecoveryValue: 0, observedRecoveredRevenue: 0 };
    current.observedRecoveredRevenue += action.amountRecovered;
    trendMap.set(period.key, current);
  });
  const exposureTrend = Array.from(trendMap.values()).sort((first, second) => first.sortKey.localeCompare(second.sortKey)).slice(-(range === "7D" ? 7 : range === "30D" ? 30 : 12)).map(({ sortKey: _sortKey, ...period }) => period);
  const highPropensityExposure = propensityBands[2]?.expectedRecoveryValue ?? 0;

  return {
    range,
    generatedAt: new Date(anchor).toISOString(),
    metrics: {
      revenueAtRisk,
      expectedRecoveryValue,
      portfolioExpectedRecoveryValue: expectedRecoveryValue + receivables.metrics.expectedRecoveryValue,
      observedRecoveredRevenue: observedRecoveredRevenue + receivables.metrics.recoveredAmount,
      observedRecoveryRate: completedActions.length ? successfulActions.length / completedActions.length : 0,
      caseCoverageRate: paymentsAtRisk.length ? coveredAtRiskPaymentIds.size / paymentsAtRisk.length : 0,
      policyApprovalRate: auditedPolicyEvents.length ? approvedPolicyEvents.length / auditedPolicyEvents.length : 0,
      concentrationRatio: failureExposure[0]?.concentration ?? 0,
      highPropensityExposure,
    },
    exposureTrend,
    failureExposure,
    propensityBands,
    actionPerformance,
    policyDistribution,
    receivables,
  };
}
