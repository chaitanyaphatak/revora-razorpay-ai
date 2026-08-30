import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("RecoverAI frontend design system", () => {
  it("defines semantic tokens and disables non-essential motion for reduced-motion users", () => {
    const styles = source("client/src/index.css");

    expect(styles).toContain("--brand-primary: #0f9488");
    expect(styles).toContain("--brand-ai: #7052ca");
    expect(styles).toContain("--shadow-flat");
    expect(styles).toContain(".rr-environment-strip");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".rr-chat-bubble");
    expect(styles).toContain(".rr-policy-reveal");
  });

  it("uses source-backed chronological ordering for overview trend buckets", () => {
    const dashboardData = source("server/recovery/data/supabaseData.ts");

    expect(dashboardData).toContain("sortKey");
    expect(dashboardData).toContain(".sort((first, second) => first.sortKey.localeCompare(second.sortKey))");
  });

  it("uses refined structured data displays instead of raw activity messages by default", () => {
    const dashboard = source("client/src/pages/OperationsDashboard.tsx");
    const controlCenter = source("client/src/pages/ControlCenter.tsx");
    const workspaces = source("client/src/pages/RevenueWorkspaces.tsx");

    expect(dashboard).toContain("<AnimatedMetric");
    expect(dashboard).toContain("<details");
    expect(dashboard).toContain("activitySummary(event.policyResult)");
    expect(controlCenter).toContain("auditSummary(item.executionResult ?? item.policyResult)");
    expect(controlCenter).toContain("<details");
    expect(workspaces).toContain("<InitialAvatar value={customer.id}");
  });

  it("keeps interactive feedback visible in Automation, Assistant, and Manual Simulation", () => {
    const automation = source("client/src/pages/AutomationSimulator.tsx");
    const assistant = source("client/src/pages/MerchantAssistant.tsx");
    const manualSimulation = source("client/src/pages/ManualExecutionSimulation.tsx");

    expect(automation).toContain('recommendationState === "loading"');
    expect(automation).toContain("rr-workflow-flow");
    expect(assistant).toContain("rr-typing-dots");
    expect(assistant).toContain("rr-chat-bubble");
    expect(manualSimulation).toContain("rr-policy-reveal");
    expect(manualSimulation).toContain("Simulation only — no external execution");
  });
});
