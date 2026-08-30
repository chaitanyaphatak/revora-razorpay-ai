import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Activity workspace and manual-simulation notifications", () => {
  it("restores a dedicated Activity destination across routing, sidebar navigation, and command search", () => {
    const routes = source("client/src/App.tsx");
    const sidebar = source("client/src/components/DashboardLayout.tsx");
    const commands = source("client/src/components/recoverai/GlobalCommandPalette.tsx");

    expect(routes).toContain('component={ActivityWorkspace}');
    expect(sidebar).toContain('label: "Activity", path: "/activity"');
    expect(sidebar).toContain('className="rr-scrollbar px-2 py-1"');
    expect(commands).toContain('label: "Activity"');
  });

  it("renders timestamped manual-simulation audit evidence from the source-backed actor label", () => {
    const activity = source("client/src/pages/ActivityWorkspace.tsx");
    const operations = source("server/recovery/data/operationsData.ts");

    expect(activity).toContain('event.actor === "manual_simulation_operator"');
    expect(activity).toContain('event.diagnosis === "manual_recovery_simulation"');
    expect(activity).toContain('[SIMULATED MANUAL]');
    expect(activity).toContain("relativeTime(event.timestamp)");
    expect(activity).toContain("Manual simulation");
    expect(activity).toContain("View record details");
    expect(operations).toContain("actor: audit.actor");
    expect(operations).toContain("diagnosis: audit.diagnosis");
  });

  it("keeps notification feedback local, temporary, and animation-aware", () => {
    const layout = source("client/src/components/DashboardLayout.tsx");
    const styles = source("client/src/index.css");

    expect(layout).toContain('window.addEventListener("revora:manual-simulation-recorded"');
    expect(layout).toContain("window.setTimeout(() => setHasUnreadManualSimulation(false), 6_000)");
    expect(layout).toContain('setLocation("/activity")');
    expect(styles).toContain("rr-notification-bell");
    expect(styles).toContain("rr-notification-ring");
    expect(styles).toContain("rr-notification-dot");
  });
});
