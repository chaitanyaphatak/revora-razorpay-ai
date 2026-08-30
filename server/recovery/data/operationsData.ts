type PaymentRow = {
  payment_id: string;
  customer_id: string;
  amount: number | string;
  status: string;
  failure_reason: string | null;
  recovery_probability: number | string | null;
  attempt_number: number;
  timestamp: string;
};

type CaseRow = {
  id: number;
  payment_id: string;
  recovery_probability: number | string | null;
  ai_recommendation: string | null;
  confidence: number | string | null;
  case_status: string;
  diagnosis: string | null;
  reasoning: string | null;
  created_at: string;
};

type ActionRow = { payment_id: string; action_type: string; execution_status: string; amount_recovered: number | string; executed_at: string | null; message: string | null };
type AuditRow = { id: number; payment_id: string; action: string | null; ai_decision: string | null; diagnosis: string | null; policy_result: string | null; execution_result: string | null; amount_recovered: number | string; reason: string | null; actor: string | null; timestamp: string };

const pageSize = 1000;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("ReVora Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

function parseTotalCount(response: Response, fallback: number) {
  const total = response.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : fallback;
}

async function fetchAll<T>(table: string, order?: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
    Prefer: "count=exact",
    "Range-Unit": "items",
  };
  const pageParams = (offset: number) => {
    const params = new URLSearchParams({ select: "*" });
    if (order) params.set("order", order);
    return params.toString();
  };
  const fetchPage = async (offset: number, withCount = false) => {
    const response = await fetch(`${url}/rest/v1/${table}?${pageParams(offset)}`, {
      headers: { ...headers, Range: `${offset}-${offset + pageSize - 1}`, ...(withCount ? {} : { Prefer: "count=none" }) },
    });
    if (!response.ok) throw new Error(`Supabase ${table} read failed with ${response.status}.`);
    const batch = await response.json() as T[];
    return { batch, total: withCount ? parseTotalCount(response, batch.length) : batch.length };
  };
  const first = await fetchPage(0, true);
  if (first.batch.length === 0 || first.batch.length >= first.total) return first.batch;
  const remainingOffsets: number[] = [];
  for (let offset = pageSize; offset < first.total; offset += pageSize) remainingOffsets.push(offset);
  const remaining = await Promise.all(remainingOffsets.map((offset) => fetchPage(offset)));
  return first.batch.concat(...remaining.map((page) => page.batch));
}

async function fetchPaymentsForIds(paymentIds: string[]) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const uniqueIds = Array.from(new Set(paymentIds)).filter(Boolean);
  const groups = Array.from({ length: Math.ceil(uniqueIds.length / 75) }, (_, index) => uniqueIds.slice(index * 75, index * 75 + 75));
  const batches = await Promise.all(groups.map(async group => {
    const response = await fetch(`${url}/rest/v1/payments?select=payment_id,customer_id,amount,status,failure_reason,recovery_probability,attempt_number,timestamp&payment_id=in.(${group.join(",")})`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Supabase payment lookup failed with ${response.status}.`);
    return response.json() as Promise<PaymentRow[]>;
  }));
  return batches.flat();
}

function numberValue(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function fraction(value: number | string | null | undefined) {
  const numeric = numberValue(value);
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

const displayAction = (value: string | null) => value?.replace(/[_-]/g, " ").replace(/\b\w/g, item => item.toUpperCase()) ?? "No action";

export async function getOperationsCenter() {
  const [cases, actions, audits] = await Promise.all([
    fetchAll<CaseRow>("recovery_cases"), fetchAll<ActionRow>("recovery_actions", "executed_at.desc"), fetchAll<AuditRow>("audit_logs", "timestamp.desc"),
  ]);
  const payments = await fetchPaymentsForIds([...cases.map(item => item.payment_id), ...actions.map(item => item.payment_id), ...audits.map(item => item.payment_id)]);
  const paymentById = new Map(payments.map(payment => [payment.payment_id, payment]));
  const playbooks = Object.values(cases.reduce<Record<string, { action: string; cases: number; totalValue: number; expectedValue: number; resolved: number }>>((groups, item) => {
    const payment = paymentById.get(item.payment_id);
    const action = item.ai_recommendation ?? "do_nothing";
    const aggregate = groups[action] ?? { action, cases: 0, totalValue: 0, expectedValue: 0, resolved: 0 };
    const amount = numberValue(payment?.amount);
    aggregate.cases += 1;
    aggregate.totalValue += amount;
    aggregate.expectedValue += amount * fraction(item.recovery_probability);
    if (item.case_status.toUpperCase() === "RESOLVED") aggregate.resolved += 1;
    groups[action] = aggregate;
    return groups;
  }, {})).map(playbook => ({ ...playbook, recoveryRate: playbook.cases ? playbook.resolved / playbook.cases : 0 })).sort((a, b) => b.expectedValue - a.expectedValue);

  const escalationQueue = cases.map(item => ({ item, payment: paymentById.get(item.payment_id) })).filter(({ item, payment }) => {
    const probability = fraction(item.recovery_probability);
    return item.case_status.toUpperCase().includes("HUMAN") || item.case_status.toUpperCase().includes("REVIEW") || numberValue(payment?.amount) > 5_000 || probability < 0.5;
  }).sort((a, b) => numberValue(b.payment?.amount) - numberValue(a.payment?.amount)).slice(0, 30).map(({ item, payment }) => ({
    caseId: item.id, paymentId: item.payment_id, customerId: payment?.customer_id ?? "Unknown", amount: numberValue(payment?.amount), probability: fraction(item.recovery_probability), recommendation: displayAction(item.ai_recommendation), diagnosis: item.diagnosis, caseStatus: item.case_status, createdAt: item.created_at,
  }));

  const autopilotCandidates = cases.map(item => ({ item, payment: paymentById.get(item.payment_id) })).filter(({ item, payment }) => {
    const probability = fraction(item.recovery_probability);
    const status = item.case_status.toUpperCase();
    return status.includes("AUTOPILOT") || (probability >= 0.7 && numberValue(payment?.amount) <= 5_000 && (payment?.attempt_number ?? 3) < 2);
  }).slice(0, 8).map(({ item, payment }) => ({ paymentId: item.payment_id, amount: numberValue(payment?.amount), probability: fraction(item.recovery_probability), action: displayAction(item.ai_recommendation), caseStatus: item.case_status }));

  const activity = actions.slice(0, 8).map(action => ({ paymentId: action.payment_id, action: displayAction(action.action_type), status: action.execution_status, amountRecovered: numberValue(action.amount_recovered), executedAt: action.executed_at, message: action.message }));
  const auditEvents = audits.map(audit => ({ id: audit.id, paymentId: audit.payment_id, action: displayAction(audit.action ?? audit.ai_decision), policyResult: audit.policy_result, executionResult: audit.execution_result, amountRecovered: numberValue(audit.amount_recovered), reason: audit.reason, diagnosis: audit.diagnosis, actor: audit.actor, timestamp: audit.timestamp }));

  return {
    autopilot: { maxAmount: 5_000, minProbability: 0.7, maxRetryAttempt: 2, eligibleCount: autopilotCandidates.length, candidates: autopilotCandidates, activity },
    playbooks, escalationQueue, auditEvents,
  };
}
