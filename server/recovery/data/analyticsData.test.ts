import { describe, expect, it } from "vitest";
import { getAnalyticsOverview } from "./supabaseData";

describe("ReVora analytics data", () => {
  it("derives bounded portfolio, policy, payment, and receivables analysis from existing source records", async () => {
    const analytics = await getAnalyticsOverview("12M");

    expect(analytics.metrics.revenueAtRisk).toBeGreaterThan(0);
    expect(analytics.metrics.expectedRecoveryValue).toBeGreaterThan(0);
    expect(analytics.metrics.expectedRecoveryValue).toBeLessThanOrEqual(analytics.metrics.revenueAtRisk);
    expect(analytics.metrics.portfolioExpectedRecoveryValue).toBeGreaterThanOrEqual(analytics.metrics.expectedRecoveryValue);
    expect(analytics.metrics.policyApprovalRate).toBeGreaterThanOrEqual(0);
    expect(analytics.metrics.policyApprovalRate).toBeLessThanOrEqual(1);
    expect(analytics.metrics.caseCoverageRate).toBeGreaterThanOrEqual(0);
    expect(analytics.metrics.caseCoverageRate).toBeLessThanOrEqual(1);
    expect(analytics.exposureTrend.length).toBeGreaterThan(0);
    expect(analytics.failureExposure.length).toBeGreaterThan(0);
    expect(analytics.propensityBands).toHaveLength(3);
    expect(analytics.actionPerformance.length).toBeGreaterThan(0);
    if (!analytics.receivables.setupRequired) {
      expect(analytics.receivables.aging).toHaveLength(5);
      expect(analytics.receivables.promiseReliability).toHaveLength(3);
    }
  }, 25_000);
});
