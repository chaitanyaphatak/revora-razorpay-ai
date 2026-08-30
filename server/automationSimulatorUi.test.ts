import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () => readFileSync(resolve(process.cwd(), "client/src/pages/AutomationSimulator.tsx"), "utf8");

describe("Automation simulator UI contract", () => {
  it("exposes functional create, configuration, control, run, history, and metrics interactions", () => {
    const page = source();

    ["Create automation", "Enable", "Disable", "Edit", "Duplicate", "Delete", "Run test", "Execution history", "Simulated Executions", "Simulated Revenue Recovered", "Recovery Success Rate"].forEach(label => expect(page).toContain(label));
    expect(page).toContain("automationSimulate.useMutation");
    expect(page).toContain("window.localStorage");
    expect(page).toContain("Simulation in progress");
  });

  it("keeps the Automation workspace explicit about its simulation-only boundary and avoids removed subscription feature language", () => {
    const page = source();

    expect(page).toContain("Demo environment — simulated recovery only");
    expect(page).toContain("never charge a customer");
    expect(page).toContain("No payment provider or communication channel is contacted during this simulation.");
    expect(page).not.toContain("Subscription");
  });
});

