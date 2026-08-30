import { describe, expect, it } from "vitest";
import { buildInvoiceRecoveryIntelligence, evaluateInvoicePolicy, simulateInvoiceRecovery } from "./invoiceRecoveryEngine";

const moderatelyOverdueDate = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
const overdueInvoice = { invoiceId: "INV-100", amount: 12000, amountPaid: 0, dueDate: moderatelyOverdueDate, status: "open" } as const;

describe("deterministic B2B receivables policy", () => {
  it("recommends a bounded follow-up for a normally overdue invoice", () => {
    const intelligence = buildInvoiceRecoveryIntelligence(overdueInvoice);
    expect(intelligence.daysOverdue).toBeGreaterThan(7);
    expect(intelligence.recommendedAction).toBe("follow_up");
    expect(intelligence.candidates.find(item => item.action === "follow_up")?.policy.result).toBe("approved");
  });

  it("requires human review for high-value or disputed receivables", () => {
    expect(evaluateInvoicePolicy({ ...overdueInvoice, amount: 75000 }, "follow_up").result).toBe("human_review_required");
    expect(evaluateInvoicePolicy({ ...overdueInvoice, status: "disputed" }, "send_reminder").ruleCode).toBe("INVOICE_DISPUTE_REVIEW");
  });

  it("validates Promise-to-Pay amount and future-date boundaries", () => {
    expect(evaluateInvoicePolicy(overdueInvoice, "mark_promise_to_pay").ruleCode).toBe("PROMISE_DETAILS_REQUIRED");
    expect(evaluateInvoicePolicy(overdueInvoice, "mark_promise_to_pay", { promisedAmount: 13000, promisedDate: "2030-01-01" }).ruleCode).toBe("PROMISE_AMOUNT_INVALID");
    expect(evaluateInvoicePolicy(overdueInvoice, "mark_promise_to_pay", { promisedAmount: 7000, promisedDate: "2030-01-01" }).result).toBe("approved");
  });

  it("treats a missed promise as a human-review signal and never simulates collection", () => {
    const invoice = { ...overdueInvoice, activePromise: { promisedAmount: 5000, promisedDate: "2020-02-01", isMissed: true } };
    expect(buildInvoiceRecoveryIntelligence(invoice).recommendedAction).toBe("escalate");
    const result = simulateInvoiceRecovery(invoice, "follow_up");
    expect(result.executionStatus).toBe("blocked");
    expect(result.amountRecovered).toBe(0);
    expect(result.message).toMatch(/No message, collection, or payment was sent/i);
  });

  it("records a deterministic simulated Promise-to-Pay outcome with no recovered amount", () => {
    const first = simulateInvoiceRecovery(overdueInvoice, "mark_promise_to_pay", { promisedAmount: 6000, promisedDate: "2030-01-01" });
    const second = simulateInvoiceRecovery(overdueInvoice, "mark_promise_to_pay", { promisedAmount: 6000, promisedDate: "2030-01-01" });
    expect(first.executionStatus).toBe("success");
    expect(first.amountRecovered).toBe(0);
    expect(first.simulationSeed).toBe(second.simulationSeed);
  });
});
