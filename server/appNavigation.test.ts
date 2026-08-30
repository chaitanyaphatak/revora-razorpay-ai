import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("RecoverAI MVP navigation", () => {
  it("removes the Subscription feature and the generic placeholder route from active source", () => {
    const routes = source("client/src/App.tsx");
    const sidebar = source("client/src/components/DashboardLayout.tsx");
    const commands = source("client/src/components/recoverai/GlobalCommandPalette.tsx");

    expect(routes).not.toContain('path={"/subscriptions"}');
    expect(routes).not.toContain("WorkspaceCoverage");
    expect(sidebar).not.toContain('label: "Subscriptions"');
    expect(commands).not.toContain('label: "Subscriptions"');
    expect(existsSync(resolve(process.cwd(), "client/src/pages/WorkspaceCoverage.tsx"))).toBe(false);
  });

  it("retains only active RecoverAI product destinations and public Settings", () => {
    const routes = source("client/src/App.tsx");
    const sidebar = source("client/src/components/DashboardLayout.tsx");

    ["/", "/risk", "/recovery", "/manual-simulation", "/customers", "/payments", "/invoices", "/assistant", "/ai-agents", "/automations", "/analytics", "/settings"].forEach(path => {
      expect(routes).toContain(path);
    });
    expect(sidebar).toContain('label: "Invoices"');
    expect(sidebar).toContain('label: "Promises"');
    expect(sidebar).toContain('label: "Assistant"');
    expect(sidebar).toContain('label: "Analytics"');
    expect(sidebar).toContain('label: "Manual simulation"');
    expect(sidebar).toContain('setLocation("/settings")');
  });

  it("removes the navigation-only Simulation Mode card but retains the Manual Simulation safety notice", () => {
    const sidebar = source("client/src/components/DashboardLayout.tsx");
    const manualSimulation = source("client/src/pages/ManualExecutionSimulation.tsx");

    expect(sidebar).not.toContain("Simulation mode");
    expect(sidebar).not.toContain("No real payment action is processed.");
    expect(manualSimulation).toContain("Simulation only — no external execution");
  });
});
