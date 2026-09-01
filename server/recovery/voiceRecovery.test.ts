import { describe, expect, it } from "vitest";
import {
  addSessionTranscriptTurn,
  createVoiceRecoverySession,
  getVoiceRecoveryAnalytics,
  getVoiceRecoverySession,
  listDemoCustomers,
  recordVoiceOutcome,
  verifyAndCompleteVoicePayment,
} from "./data/voiceRecoveryStore.js";
import { isVoiceRecoveryEligible } from "./domain/recoveryEngine.js";

// Minimal NormalizedPayment shape for eligibility tests
const makePayment = (overrides: Partial<{
  amount: number;
  attemptNumber: number;
  status: string;
}>) => ({
  id: "P-TEST-001",
  customerId: "C-TEST",
  amount: overrides.amount ?? 2999,
  currency: "INR",
  paymentMethod: "upi",
  gateway: "razorpay",
  status: overrides.status ?? "failed",
  failureReason: "upi_timeout",
  attemptNumber: overrides.attemptNumber ?? 1,
  previousFailures: 0,
  recoveryProbability: 0.82,
  recoveryConfidence: 0.88,
  recoverable: true,
  recoveryStatus: "PENDING",
  timestamp: new Date().toISOString(),
  merchantCategory: "digital_services",
  customerTenure: 180,
  deviceType: "mobile",
  country: "IN",
  isRecurring: true,
  daysSinceLastSuccess: 3,
  customerSuccessHistory: 0.85,
});

describe("Voice Recovery Channel Engine & Store", () => {
  it("evaluates voice recovery eligibility correctly based on business rules", () => {
    // Eligible: amount >= 1000, attempts < 3, failed
    expect(
      isVoiceRecoveryEligible(makePayment({ amount: 2999, attemptNumber: 2, status: "failed" })).eligible,
    ).toBe(true);

    // Ineligible: amount < 1000
    expect(
      isVoiceRecoveryEligible(makePayment({ amount: 499, attemptNumber: 1, status: "failed" })).eligible,
    ).toBe(false);

    // Ineligible: attempts >= 3
    expect(
      isVoiceRecoveryEligible(makePayment({ amount: 3500, attemptNumber: 3, status: "failed" })).eligible,
    ).toBe(false);

    // Ineligible: already succeeded
    expect(
      isVoiceRecoveryEligible(makePayment({ amount: 5000, attemptNumber: 1, status: "succeeded" })).eligible,
    ).toBe(false);
  });

  it("lists customer records without demo prefixes in IDs", () => {
    const customers = listDemoCustomers();
    expect(customers.length).toBeGreaterThanOrEqual(2);

    const rahul = customers.find((c) => c.customerName === "Rahul Sharma");
    const priya = customers.find((c) => c.customerName === "Priya Patel");

    expect(rahul).toBeDefined();
    expect(rahul?.paymentId).toBe("P-98421");
    expect(rahul?.customerId).not.toContain("DEMO");

    expect(priya).toBeDefined();
    expect(priya?.paymentId).toBe("P-76219");
    expect(priya?.customerId).not.toContain("DEMO");
  });

  it("creates a voice recovery session with email_sent status and greets in transcript", () => {
    const session = createVoiceRecoverySession("P-98421", "Acme Digital");
    expect(session.sessionId).toMatch(/^rec_/);
    expect(session.customerName).toBe("Rahul Sharma");
    expect(session.amount).toBe(2999);
    // Session starts as email_sent after createVoiceRecoverySession
    expect(session.status).toBe("email_sent");
    // Auto system greeting is added
    expect(session.transcript.length).toBeGreaterThanOrEqual(1);
    expect(session.transcript[0].role).toBe("system");
  });

  it("adds user and assistant transcript turns correctly", () => {
    const session = createVoiceRecoverySession("P-98421");
    const initialCount = session.transcript.length;

    // addSessionTranscriptTurn returns the updated session, not just the turn
    const updatedSession1 = addSessionTranscriptTurn(session.sessionId, {
      role: "user",
      text: "Mera payment fail ho gaya tha UPI se, kya dusra method hai?",
    });
    expect(updatedSession1).toBeDefined();
    const userTurn = updatedSession1?.transcript.at(-1);
    expect(userTurn?.role).toBe("user");
    expect(userTurn?.text).toContain("Mera payment fail ho gaya tha");

    const updatedSession2 = addSessionTranscriptTurn(session.sessionId, {
      role: "assistant",
      text: "Ji bilkul Rahul ji, aap Card se turant payment kar sakte hain.",
      intent: "RETRY_PAYMENT",
    });
    const assistantTurn = updatedSession2?.transcript.at(-1);
    expect(assistantTurn?.intent).toBe("RETRY_PAYMENT");

    const fetched = getVoiceRecoverySession(session.sessionId);
    // 1 system greeting + 1 user + 1 assistant = initialCount + 2
    expect(fetched?.transcript.length).toBe(initialCount + 2);
  });

  it("verifies and completes Razorpay Test payment successfully", async () => {
    const session = createVoiceRecoverySession("P-98421");
    const result = await verifyAndCompleteVoicePayment(session.sessionId, {
      razorpayPaymentId: "pay_test_999",
      paymentMethod: "upi",
    });

    expect(result.success).toBe(true);
    expect(result.session.status).toBe("recovered");
    expect(result.session.recoveredAmount).toBe(2999);
    expect(result.session.paymentReference).toBe("pay_test_999");
  });

  it("records Promise-to-Pay outcome and updates session status", async () => {
    const session = createVoiceRecoverySession("P-76219");
    // recordVoiceOutcome returns the session directly (not wrapped)
    const updatedSession = await recordVoiceOutcome(session.sessionId, {
      outcomeType: "PROMISE_TO_PAY",
      promiseToPayDate: "2026-09-05",
      reason: "Customer promised to pay after salary credit on 5th",
    });

    expect(updatedSession.status).toBe("promised_to_pay");
    expect(updatedSession.promiseToPayDate).toBe("2026-09-05");
  });

  it("processes Hinglish failure explanation and payment gateway trigger intent", async () => {
    const { processGeminiVoiceTurn } = await import("./ai/geminiVoiceRecovery.js");
    const session = createVoiceRecoverySession("P-98421");

    // 1. Customer asks WHY payment failed
    const turn1 = await processGeminiVoiceTurn(session, "Mera payment kyu fail hua tha?");
    expect(turn1.replyText).toContain("timeout");
    expect(turn1.intent).toBe("ASK_FAILURE_REASON");

    // 2. Customer asks to pay / send link / retry
    const turn2 = await processGeminiVoiceTurn(session, "Payment link bhejo mai wapas try karunga");
    expect(turn2.action).toBe("OPEN_PAYMENT_GATEWAY");
    expect(turn2.openGateway).toBe(true);
  });
});

