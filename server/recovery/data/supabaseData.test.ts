import { describe, expect, it } from "vitest";
import { getDashboardOverview, getPaymentDetail, listPayments, normalizeFraction, normalizePaymentStatus } from "./supabaseData";

describe("Supabase recovery data normalization", () => {
  it("converts fractional and percent-like probabilities to a bounded fraction", () => {
    expect(normalizeFraction(0.8143)).toBe(0.8143);
    expect(normalizeFraction("81.43")).toBe(0.8143);
    expect(normalizeFraction(null)).toBeNull();
    expect(normalizeFraction(2)).toBe(0.02);
  });

  it("normalizes payment statuses without changing the source system", () => {
    expect(normalizePaymentStatus("FAILED")).toBe("failed");
    expect(normalizePaymentStatus("RECOVERED")).toBe("recovered");
    expect(normalizePaymentStatus("PROCESSING")).toBe("pending");
    expect(normalizePaymentStatus("unexpected")).toBe("unknown");
  });
});

describe("Supabase recovery data access", () => {
  it("reads a page and an existing payment detail without mutating Supabase", async () => {
    const page = await listPayments({ page: 1, pageSize: 5, sort: "newest" });

    expect(page.total).toBeGreaterThanOrEqual(10_000);
    expect(page.payments).toHaveLength(5);
    expect(page.payments[0]?.id).toMatch(/^P/);

    const detail = await getPaymentDetail("P00272");
    expect(detail?.payment.id).toBe("P00272");
    expect(detail?.recoveryCase?.recommendation).toBeTruthy();
    expect(Array.isArray(detail?.policyDecisions)).toBe(true);
  }, 15_000);

  it("calculates dashboard metrics from existing source records", async () => {
    const dashboard = await getDashboardOverview("12M");

    expect(dashboard.metrics.totalPayments).toBeGreaterThanOrEqual(10_000);
    expect(dashboard.metrics.revenueAtRisk).toBeGreaterThan(0);
    expect(dashboard.metrics.recoverableRevenue).toBeGreaterThan(0);
    expect(dashboard.failurePerformance.length).toBeGreaterThan(0);
    expect(dashboard.activity.length).toBeGreaterThan(0);
  }, 20_000);
});
