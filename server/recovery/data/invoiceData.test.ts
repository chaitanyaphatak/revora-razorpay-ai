import { afterEach, describe, expect, it, vi } from "vitest";
import { getInvoiceDashboard, getPromiseTracker, listInvoices } from "./invoiceData";

const originalEnv = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
const records = {
  invoices: [
    { id: 1, invoice_id: "INV-100", customer_id: "C-100", customer_name: "Acme Buyer", amount: 12000, currency: "INR", issued_date: "2020-01-01", due_date: "2020-01-15", status: "open", payment_terms_days: 14, payment_reference: "PO-44", notes: null, created_at: "2020-01-01T00:00:00.000Z", updated_at: "2020-01-01T00:00:00.000Z" },
    { id: 2, invoice_id: "INV-200", customer_id: "C-200", customer_name: "Settled Buyer", amount: 9000, currency: "INR", issued_date: "2020-01-01", due_date: "2020-01-15", status: "paid", payment_terms_days: 14, payment_reference: null, notes: null, created_at: "2020-01-01T00:00:00.000Z", updated_at: "2020-01-01T00:00:00.000Z" },
  ],
  invoice_promises: [{ id: 1, invoice_id: "INV-100", promised_amount: 8000, promised_date: "2020-02-01", status: "active", note: null, created_at: "2020-01-20T00:00:00.000Z", updated_at: "2020-01-20T00:00:00.000Z" }],
  invoice_policy_decisions: [], invoice_recovery_actions: [], invoice_audit_logs: [],
};

function mockReceivablesReads() {
  process.env.SUPABASE_URL = "https://supabase.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-test-key";
  return vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
    const url = String(input);
    const table = Object.keys(records).find(key => url.includes(`/rest/v1/${key}?`));
    return { ok: true, status: 200, json: async () => table ? records[table as keyof typeof records] : [] } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalEnv.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalEnv.url;
  if (originalEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.key;
});

describe("invoice read model", () => {
  it("derives source-backed invoice KPIs, recovery risk, and missed-promise status", async () => {
    mockReceivablesReads();
    const dashboard = await getInvoiceDashboard();
    expect(dashboard.setupRequired).toBe(false);
    expect(dashboard.metrics.totalInvoices).toBe(2);
    expect(dashboard.metrics.outstandingAmount).toBe(12000);
    expect(dashboard.metrics.overdueAmount).toBe(12000);
    expect(dashboard.metrics.atRiskAmount).toBe(12000);
    expect(dashboard.promiseSummary.missed).toBe(1);
  });

  it("filters the invoice queue and Promise-to-Pay tracker from the approved source", async () => {
    mockReceivablesReads();
    const invoices = await listInvoices({ page: 1, pageSize: 10, overdueOnly: true, search: "INV-100" });
    const promises = await getPromiseTracker({ page: 1, pageSize: 10, status: "missed" });
    expect(invoices.invoices).toHaveLength(1);
    expect(invoices.invoices[0]?.id).toBe("INV-100");
    expect(invoices.invoices[0]?.activePromise?.isMissed).toBe(true);
    expect(promises.promises).toHaveLength(1);
    expect(promises.promises[0]?.invoiceId).toBe("INV-100");
  });
});
