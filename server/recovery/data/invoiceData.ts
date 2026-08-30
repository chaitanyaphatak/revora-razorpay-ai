import { buildInvoiceRecoveryIntelligence, getInvoiceDaysOverdue, getInvoiceOutstandingAmount, type InvoiceRecoveryAction, type InvoiceRiskInput } from "../domain/invoiceRecoveryEngine.js";

type RawInvoice = { id: number; invoice_id: string; customer_id: string; customer_name: string | null; amount: number | string; currency: string; issued_date: string; due_date: string; status: string; payment_terms_days: number | null; payment_reference: string | null; notes: string | null; created_at: string; updated_at: string };
type RawPromise = { id: number; invoice_id: string; promised_amount: number | string; promised_date: string; status: string; note: string | null; created_at: string; updated_at: string };
type RawInvoicePolicy = { id: number; invoice_id: string; action: string; policy_result: string; rule_code: string; reason: string; recovery_probability: number | string; outstanding_amount: number | string; policy_version: string; actor: string; simulation_only: boolean; decision_timestamp: string };
type RawInvoiceAction = { id: number; invoice_id: string; action_type: string; execution_status: string; amount_recovered: number | string; executed_at: string; message: string };
type RawInvoiceAudit = { id: number; invoice_id: string; ai_decision: string | null; diagnosis: string | null; recovery_probability: number | string | null; policy_result: string | null; action: string | null; execution_result: string | null; amount_recovered: number | string; reason: string | null; timestamp: string };

export type InvoiceStatus = "draft" | "open" | "partially_paid" | "paid" | "written_off" | "disputed" | "cancelled" | "unknown";
export type PromiseStatus = "active" | "kept" | "missed" | "cancelled" | "unknown";
export type NormalizedInvoicePromise = { id: number; invoiceId: string; promisedAmount: number; promisedDate: string; status: PromiseStatus; note: string | null; createdAt: string; isMissed: boolean; isSimulationDemo: boolean };
export type InvoiceSnapshot = {
  id: string;
  customerId: string;
  customerName: string | null;
  amount: number;
  currency: string;
  issuedDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentTermsDays: number | null;
  paymentReference: string | null;
  notes: string | null;
  amountRecovered: number;
  outstandingAmount: number;
  daysOverdue: number;
  recoveryProbability: number;
  recoveryRisk: "low" | "medium" | "high";
  recommendedAction: InvoiceRecoveryAction;
  activePromise: NormalizedInvoicePromise | null;
  isSimulationDemo: boolean;
};
export type InvoiceModuleStatus = { setupRequired: boolean; message?: string };
export type InvoiceFilters = { page: number; pageSize: number; search?: string; status?: InvoiceStatus; risk?: "low" | "medium" | "high"; overdueOnly?: boolean };

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("ReVora Supabase server credentials are not configured.");
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

function numeric(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedStatus(value: string): InvoiceStatus {
  return ["draft", "open", "partially_paid", "paid", "written_off", "disputed", "cancelled"].includes(value.toLowerCase()) ? value.toLowerCase() as InvoiceStatus : "unknown";
}

function normalizedPromiseStatus(value: string): PromiseStatus {
  return ["active", "kept", "missed", "cancelled"].includes(value.toLowerCase()) ? value.toLowerCase() as PromiseStatus : "unknown";
}

function isBeforeToday(value: string) {
  const today = new Date().toISOString().slice(0, 10);
  return value.slice(0, 10) < today;
}

async function fetchTable<T>(table: string): Promise<T[] | null> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const pageSize = 1_000;
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
    Prefer: "count=exact",
    "Range-Unit": "items",
  };
  const fetchPage = async (offset: number, withCount = false) => {
    const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${offset}-${offset + pageSize - 1}`, ...(withCount ? {} : { Prefer: "count=none" }) },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Supabase ${table} read failed with ${response.status}.`);
    const batch = await response.json() as T[];
    const totalHeader = response.headers.get("content-range")?.split("/")[1];
    return { batch, total: totalHeader && totalHeader !== "*" ? Number(totalHeader) : batch.length };
  };
  const first = await fetchPage(0, true);
  if (!first) return null;
  if (first.batch.length === 0 || first.batch.length >= first.total) return first.batch;
  const remainingOffsets: number[] = [];
  for (let offset = pageSize; offset < first.total; offset += pageSize) remainingOffsets.push(offset);
  const remaining = await Promise.all(remainingOffsets.map((offset) => fetchPage(offset)));
  if (remaining.some((page) => page === null)) return first.batch;
  return first.batch.concat(...remaining.map((page) => page!.batch));
}

type ReceivablesData = { invoices: RawInvoice[]; promises: RawPromise[]; policies: RawInvoicePolicy[]; actions: RawInvoiceAction[]; audits: RawInvoiceAudit[] };

async function loadReceivables(): Promise<ReceivablesData | null> {
  const [invoices, promises, policies, actions, audits] = await Promise.all([
    fetchTable<RawInvoice>("invoices"), fetchTable<RawPromise>("invoice_promises"), fetchTable<RawInvoicePolicy>("invoice_policy_decisions"), fetchTable<RawInvoiceAction>("invoice_recovery_actions"), fetchTable<RawInvoiceAudit>("invoice_audit_logs"),
  ]);
  if (!invoices || !promises || !policies || !actions || !audits) return null;
  return { invoices, promises, policies, actions, audits };
}

const setupResponse = (): InvoiceModuleStatus => ({ setupRequired: true, message: "Invoice source tables are not available yet. Review database/README.md and manually apply database/04_add_invoice_receivables.sql before importing approved invoice records." });

function normalisePromise(raw: RawPromise): NormalizedInvoicePromise {
  const status = normalizedPromiseStatus(raw.status);
  return { id: raw.id, invoiceId: raw.invoice_id, promisedAmount: numeric(raw.promised_amount), promisedDate: raw.promised_date, status, note: raw.note, createdAt: raw.created_at, isMissed: status === "active" && isBeforeToday(raw.promised_date), isSimulationDemo: raw.invoice_id.startsWith("DEMO-") };
}

function buildSnapshot(raw: RawInvoice, promises: RawPromise[], actions: RawInvoiceAction[]): InvoiceSnapshot {
  const normalisedPromises = promises.map(normalisePromise).filter(item => item.invoiceId === raw.invoice_id).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const activePromise = normalisedPromises.find(item => item.status === "active") ?? null;
  const amountRecovered = actions.filter(item => item.invoice_id === raw.invoice_id && item.execution_status.toUpperCase() === "SUCCESS").reduce((sum, item) => sum + numeric(item.amount_recovered), 0);
  const riskInput: InvoiceRiskInput = { invoiceId: raw.invoice_id, amount: numeric(raw.amount), amountPaid: amountRecovered, dueDate: raw.due_date, status: normalizedStatus(raw.status), activePromise: activePromise ? { promisedAmount: activePromise.promisedAmount, promisedDate: activePromise.promisedDate, isMissed: activePromise.isMissed } : null };
  const intelligence = buildInvoiceRecoveryIntelligence(riskInput);
  return { id: raw.invoice_id, customerId: raw.customer_id, customerName: raw.customer_name, amount: numeric(raw.amount), currency: raw.currency || "INR", issuedDate: raw.issued_date, dueDate: raw.due_date, status: normalizedStatus(raw.status), paymentTermsDays: raw.payment_terms_days, paymentReference: raw.payment_reference, notes: raw.notes, amountRecovered: Number(amountRecovered.toFixed(2)), outstandingAmount: getInvoiceOutstandingAmount(riskInput), daysOverdue: getInvoiceDaysOverdue(riskInput), recoveryProbability: intelligence.recoveryProbability, recoveryRisk: intelligence.recoveryRisk, recommendedAction: intelligence.recommendedAction, activePromise, isSimulationDemo: raw.invoice_id.startsWith("DEMO-") };
}

function allSnapshots(data: ReceivablesData) {
  return data.invoices.map(invoice => buildSnapshot(invoice, data.promises, data.actions));
}

function includesSearch(invoice: InvoiceSnapshot, search: string) {
  const needle = search.trim().toLowerCase();
  return !needle || [invoice.id, invoice.customerId, invoice.customerName ?? "", invoice.paymentReference ?? ""].some(value => value.toLowerCase().includes(needle));
}

export async function getInvoiceDashboard() {
  const data = await loadReceivables();
  if (!data) return { ...setupResponse(), metrics: { totalInvoices: 0, outstandingAmount: 0, overdueAmount: 0, overdueCount: 0, atRiskAmount: 0, atRiskCount: 0, recoveredAmount: 0 }, riskDistribution: [], recentInvoices: [], promiseSummary: { active: 0, missed: 0, promisedAmount: 0 } };
  const invoices = allSnapshots(data);
  const outstanding = invoices.filter(invoice => invoice.outstandingAmount > 0);
  const overdue = outstanding.filter(invoice => invoice.daysOverdue > 0);
  const atRisk = outstanding.filter(invoice => invoice.recoveryRisk === "high" || Boolean(invoice.activePromise?.isMissed));
  const promises = data.promises.map(normalisePromise);
  return {
    setupRequired: false, message: undefined,
    metrics: { totalInvoices: invoices.length, outstandingAmount: outstanding.reduce((sum, item) => sum + item.outstandingAmount, 0), overdueAmount: overdue.reduce((sum, item) => sum + item.outstandingAmount, 0), overdueCount: overdue.length, atRiskAmount: atRisk.reduce((sum, item) => sum + item.outstandingAmount, 0), atRiskCount: atRisk.length, recoveredAmount: invoices.reduce((sum, item) => sum + item.amountRecovered, 0) },
    riskDistribution: ["high", "medium", "low"].map(risk => ({ risk, count: invoices.filter(invoice => invoice.recoveryRisk === risk).length, value: invoices.filter(invoice => invoice.recoveryRisk === risk).reduce((sum, invoice) => sum + invoice.outstandingAmount, 0) })),
    recentInvoices: [...invoices].sort((first, second) => second.dueDate.localeCompare(first.dueDate)).slice(0, 6),
    promiseSummary: { active: promises.filter(item => item.status === "active" && !item.isMissed).length, missed: promises.filter(item => item.isMissed).length, promisedAmount: promises.filter(item => item.status === "active").reduce((sum, item) => sum + item.promisedAmount, 0) },
  };
}

export async function listInvoices(filters: InvoiceFilters) {
  const data = await loadReceivables();
  if (!data) return { ...setupResponse(), invoices: [] as InvoiceSnapshot[], total: 0, page: filters.page, pageSize: filters.pageSize };
  const matching = allSnapshots(data).filter(invoice => includesSearch(invoice, filters.search ?? "") && (!filters.status || invoice.status === filters.status) && (!filters.risk || invoice.recoveryRisk === filters.risk) && (!filters.overdueOnly || invoice.daysOverdue > 0)).sort((first, second) => second.daysOverdue - first.daysOverdue || second.outstandingAmount - first.outstandingAmount);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const page = Math.max(1, filters.page);
  return { setupRequired: false, message: undefined, invoices: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pageSize };
}

export async function getInvoiceDetail(invoiceId: string) {
  const data = await loadReceivables();
  if (!data) return { ...setupResponse(), invoice: null, promises: [], policyDecisions: [], actions: [], auditTimeline: [] };
  const raw = data.invoices.find(invoice => invoice.invoice_id === invoiceId);
  if (!raw) return { setupRequired: false, message: undefined, invoice: null, promises: [], policyDecisions: [], actions: [], auditTimeline: [] };
  const invoice = buildSnapshot(raw, data.promises, data.actions);
  const riskInput: InvoiceRiskInput = { invoiceId: invoice.id, amount: invoice.amount, amountPaid: invoice.amountRecovered, dueDate: invoice.dueDate, status: invoice.status, activePromise: invoice.activePromise ? { promisedAmount: invoice.activePromise.promisedAmount, promisedDate: invoice.activePromise.promisedDate, isMissed: invoice.activePromise.isMissed } : null };
  return {
    setupRequired: false, message: undefined,
    invoice,
    intelligence: buildInvoiceRecoveryIntelligence(riskInput),
    promises: data.promises.map(normalisePromise).filter(item => item.invoiceId === invoiceId).sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
    policyDecisions: data.policies.filter(item => item.invoice_id === invoiceId).sort((first, second) => second.decision_timestamp.localeCompare(first.decision_timestamp)).map(item => ({ id: item.id, action: item.action, result: item.policy_result.toLowerCase(), ruleCode: item.rule_code, reason: item.reason, recoveryProbability: numeric(item.recovery_probability), outstandingAmount: numeric(item.outstanding_amount), timestamp: item.decision_timestamp })),
    actions: data.actions.filter(item => item.invoice_id === invoiceId).sort((first, second) => second.executed_at.localeCompare(first.executed_at)).map(item => ({ id: item.id, action: item.action_type, status: item.execution_status.toLowerCase(), amountRecovered: numeric(item.amount_recovered), executedAt: item.executed_at, message: item.message })),
    auditTimeline: data.audits.filter(item => item.invoice_id === invoiceId).sort((first, second) => second.timestamp.localeCompare(first.timestamp)).map(item => ({ id: item.id, action: item.action ?? item.ai_decision, policyResult: item.policy_result?.toLowerCase() ?? null, executionResult: item.execution_result?.toLowerCase() ?? null, amountRecovered: numeric(item.amount_recovered), reason: item.reason, timestamp: item.timestamp })),
  };
}

export async function getPromiseTracker(filters: { status?: PromiseStatus; page: number; pageSize: number }) {
  const data = await loadReceivables();
  if (!data) return { ...setupResponse(), promises: [] as Array<NormalizedInvoicePromise & { customerName: string | null; outstandingAmount: number }>, total: 0, page: filters.page, pageSize: filters.pageSize };
  const invoiceMap = new Map(allSnapshots(data).map(invoice => [invoice.id, invoice]));
  const matching = data.promises.map(normalisePromise).map(promise => ({ ...promise, customerName: invoiceMap.get(promise.invoiceId)?.customerName ?? null, outstandingAmount: invoiceMap.get(promise.invoiceId)?.outstandingAmount ?? 0 })).filter(promise => !filters.status || promise.status === filters.status || (filters.status === "missed" && promise.isMissed)).sort((first, second) => Number(second.isMissed) - Number(first.isMissed) || first.promisedDate.localeCompare(second.promisedDate));
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const page = Math.max(1, filters.page);
  return { setupRequired: false, message: undefined, promises: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pageSize };
}

export async function getInvoiceRiskInput(invoiceId: string): Promise<{ input: InvoiceRiskInput; invoice: InvoiceSnapshot } | null> {
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail.invoice) return null;
  const invoice = detail.invoice;
  return { invoice, input: { invoiceId: invoice.id, amount: invoice.amount, amountPaid: invoice.amountRecovered, dueDate: invoice.dueDate, status: invoice.status, activePromise: invoice.activePromise ? { promisedAmount: invoice.activePromise.promisedAmount, promisedDate: invoice.activePromise.promisedDate, isMissed: invoice.activePromise.isMissed } : null } };
}

export async function getReceivablesAnalytics() {
  const data = await loadReceivables();
  if (!data) {
    return {
      setupRequired: true,
      metrics: { outstandingAmount: 0, expectedRecoveryValue: 0, overdueAmount: 0, overdueCount: 0, recoveredAmount: 0 },
      aging: [] as Array<{ bucket: string; count: number; outstandingAmount: number; expectedRecoveryValue: number }>,
      promiseReliability: [] as Array<{ status: string; count: number; promisedAmount: number }>,
      riskDistribution: [] as Array<{ risk: string; count: number; outstandingAmount: number }>,
    };
  }

  const invoices = allSnapshots(data);
  const outstanding = invoices.filter(invoice => invoice.outstandingAmount > 0);
  const agingBuckets = [
    { bucket: "Current", matches: (days: number) => days <= 0 },
    { bucket: "1–30 days", matches: (days: number) => days >= 1 && days <= 30 },
    { bucket: "31–60 days", matches: (days: number) => days >= 31 && days <= 60 },
    { bucket: "61–90 days", matches: (days: number) => days >= 61 && days <= 90 },
    { bucket: "90+ days", matches: (days: number) => days > 90 },
  ];
  const promises = data.promises.map(normalisePromise);
  const promiseStatuses = [
    { status: "Active", matches: (promise: NormalizedInvoicePromise) => promise.status === "active" && !promise.isMissed },
    { status: "Kept", matches: (promise: NormalizedInvoicePromise) => promise.status === "kept" },
    { status: "Missed", matches: (promise: NormalizedInvoicePromise) => promise.status === "missed" || promise.isMissed },
  ];

  return {
    setupRequired: false,
    metrics: {
      outstandingAmount: outstanding.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0),
      expectedRecoveryValue: outstanding.reduce((sum, invoice) => sum + invoice.outstandingAmount * invoice.recoveryProbability, 0),
      overdueAmount: outstanding.filter(invoice => invoice.daysOverdue > 0).reduce((sum, invoice) => sum + invoice.outstandingAmount, 0),
      overdueCount: outstanding.filter(invoice => invoice.daysOverdue > 0).length,
      recoveredAmount: invoices.reduce((sum, invoice) => sum + invoice.amountRecovered, 0),
    },
    aging: agingBuckets.map(group => {
      const matching = outstanding.filter(invoice => group.matches(invoice.daysOverdue));
      return {
        bucket: group.bucket,
        count: matching.length,
        outstandingAmount: matching.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0),
        expectedRecoveryValue: matching.reduce((sum, invoice) => sum + invoice.outstandingAmount * invoice.recoveryProbability, 0),
      };
    }),
    promiseReliability: promiseStatuses.map(group => {
      const matching = promises.filter(group.matches);
      return { status: group.status, count: matching.length, promisedAmount: matching.reduce((sum, promise) => sum + promise.promisedAmount, 0) };
    }),
    riskDistribution: ["high", "medium", "low"].map(risk => {
      const matching = outstanding.filter(invoice => invoice.recoveryRisk === risk);
      return { risk, count: matching.length, outstandingAmount: matching.reduce((sum, invoice) => sum + invoice.outstandingAmount, 0) };
    }),
  };
}
