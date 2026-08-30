import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = () => readFileSync(resolve(process.cwd(), "client/src/pages/ManualExecutionSimulation.tsx"), "utf8");
const styleSource = () => readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("manual simulation execution feedback", () => {
  it("provides distinct processing and success states without changing the explicit simulation boundary", () => {
    const source = pageSource();

    expect(source).toContain("minimumProcessingFeedbackMs = 650");
    expect(source).toContain("Recording simulated outcome…");
    expect(source).toContain("Simulation recorded");
    expect(source).toContain("Validating and saving simulation audit evidence…");
    expect(source).toContain("This never initiates a payment, retry, customer message, or collection action.");
    expect(source).toContain("simulation.mutate({ paymentId: input.paymentId, action, outcome");
    expect(source).toContain('new CustomEvent("revora:manual-simulation-recorded"');
    expect(source).toContain("timestamp: new Date().toISOString()");
  });

  it("keeps the execution interaction accessible and respects reduced-motion preferences", () => {
    const source = pageSource();
    const styles = styleSource();

    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('aria-label={isExecuting ? "Recording manual simulation"');
    expect(source).toContain('disabled={isExecuting || !eligible}');
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("rr-execution-spinner");
    expect(styles).toContain("rr-execution-check-pop");
  });
});
