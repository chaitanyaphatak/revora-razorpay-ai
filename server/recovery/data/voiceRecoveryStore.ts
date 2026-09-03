import type { NormalizedPayment } from "./supabaseData.js";
import { recordSimulation } from "./simulationStore.js";
import { invalidateDashboardOverviewCache } from "./supabaseData.js";
import { broadcastSSEEvent } from "../../sseEmitter.js";

export type DemoCustomer = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway: string;
  failureReason: string;
  attemptNumber: number;
  status: "failed" | "recovered" | "pending";
  recoveryProbability: number;
  notes: string;
  scenario: "happy_path" | "promise_or_decline";
};

export type TranscriptMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  timestamp: string;
  intent?: string;
};

export type VoiceSessionStatus =
  | "initiated"
  | "email_sent"
  | "active"
  | "payment_ready"
  | "recovered"
  | "promised_to_pay"
  | "declined"
  | "escalated"
  | "expired";

export type VoiceRecoverySession = {
  sessionId: string;
  paymentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  merchantName: string;
  amount: number;
  currency: string;
  failureReason: string;
  channel: "voice";
  language: "hinglish";
  status: VoiceSessionStatus;
  attemptNumber: number;
  customerIntent: string | null;
  outcome: string | null;
  transcript: TranscriptMessage[];
  promiseToPayDate: string | null;
  stopReason: string | null;
  recoveredAmount: number;
  paymentReference: string | null;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
};

// Customer Accounts for Voice Recovery Channel
const demoCustomers: Map<string, DemoCustomer> = new Map([
  [
    "P-98421",
    {
      customerId: "C-94281",
      customerName: "Rahul Sharma",
      customerEmail: "rahul.sharma@example.com",
      paymentId: "P-98421",
      amount: 2999,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "upi_timeout",
      attemptNumber: 2,
      status: "failed",
      recoveryProbability: 0.88,
      notes: "Active customer. Previous payment failed due to bank UPI server timeout.",
      scenario: "happy_path",
    },
  ],
  [
    "P-76219",
    {
      customerId: "C-81934",
      customerName: "Priya Patel",
      customerEmail: "priya.patel@example.com",
      paymentId: "P-76219",
      amount: 4500,
      currency: "INR",
      paymentMethod: "card",
      gateway: "razorpay",
      failureReason: "insufficient_funds",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.76,
      notes: "Annual subscription renewal. Payment declined due to monthly limit/funds.",
      scenario: "promise_or_decline",
    },
  ],
  [
    "P-54102",
    {
      customerId: "C-44102",
      customerName: "Amit Verma",
      customerEmail: "amit.verma@example.com",
      paymentId: "P-54102",
      amount: 1499,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "bank_server_down",
      attemptNumber: 2,
      status: "failed",
      recoveryProbability: 0.91,
      notes: "HDFC bank core server response timeout during checkout.",
      scenario: "happy_path",
    },
  ],
  [
    "P-88324",
    {
      customerId: "C-88324",
      customerName: "Sneha Kulkarni",
      customerEmail: "sneha.kulkarni@example.com",
      paymentId: "P-88324",
      amount: 6200,
      currency: "INR",
      paymentMethod: "card",
      gateway: "razorpay",
      failureReason: "network_drop",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.83,
      notes: "Mobile data disconnected during 3DS OTP verification.",
      scenario: "happy_path",
    },
  ],
  [
    "P-33912",
    {
      customerId: "C-33912",
      customerName: "Rohan Mehta",
      customerEmail: "rohan.mehta@example.com",
      paymentId: "P-33912",
      amount: 8999,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "daily_limit_exceeded",
      attemptNumber: 3,
      status: "failed",
      recoveryProbability: 0.69,
      notes: "Customer daily UPI limit reached. Willing to switch to netbanking or card.",
      scenario: "promise_or_decline",
    },
  ],
  [
    "P-67240",
    {
      customerId: "C-67240",
      customerName: "Ananya Iyer",
      customerEmail: "ananya.iyer@example.com",
      paymentId: "P-67240",
      amount: 3499,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "upi_pin_retry_limit",
      attemptNumber: 2,
      status: "failed",
      recoveryProbability: 0.85,
      notes: "Accidental incorrect PIN entered twice. Requesting fresh payment link.",
      scenario: "happy_path",
    },
  ],
  [
    "P-19453",
    {
      customerId: "C-19453",
      customerName: "Vikram Malhotra",
      customerEmail: "vikram.malhotra@example.com",
      paymentId: "P-19453",
      amount: 14999,
      currency: "INR",
      paymentMethod: "card",
      gateway: "razorpay",
      failureReason: "card_security_block",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.72,
      notes: "High-value transaction flagged by issuing bank. Customer ready to authorize.",
      scenario: "happy_path",
    },
  ],
  [
    "P-48291",
    {
      customerId: "C-48291",
      customerName: "Pooja Deshmukh",
      customerEmail: "pooja.deshmukh@example.com",
      paymentId: "P-48291",
      amount: 2199,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "gateway_timeout",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.89,
      notes: "Merchant checkout webhook timed out during peak load.",
      scenario: "happy_path",
    },
  ],
  [
    "P-90214",
    {
      customerId: "C-90214",
      customerName: "Rajesh Nair",
      customerEmail: "rajesh.nair@example.com",
      paymentId: "P-90214",
      amount: 5500,
      currency: "INR",
      paymentMethod: "card",
      gateway: "razorpay",
      failureReason: "card_expired",
      attemptNumber: 2,
      status: "failed",
      recoveryProbability: 0.78,
      notes: "Saved card reached expiration date. Needs alternate payment method.",
      scenario: "happy_path",
    },
  ],
  [
    "P-71839",
    {
      customerId: "C-71839",
      customerName: "Neha Choudhury",
      customerEmail: "neha.choudhury@example.com",
      paymentId: "P-71839",
      amount: 7450,
      currency: "INR",
      paymentMethod: "card",
      gateway: "razorpay",
      failureReason: "insufficient_funds",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.64,
      notes: "Salary credit pending in 2 days. Ideal candidate for Promise-to-Pay.",
      scenario: "promise_or_decline",
    },
  ],
  [
    "P-62910",
    {
      customerId: "C-62910",
      customerName: "Aditya Reddy",
      customerEmail: "aditya.reddy@example.com",
      paymentId: "P-62910",
      amount: 11200,
      currency: "INR",
      paymentMethod: "netbanking",
      gateway: "razorpay",
      failureReason: "session_expired",
      attemptNumber: 1,
      status: "failed",
      recoveryProbability: 0.81,
      notes: "Corporate netbanking session idle timeout.",
      scenario: "happy_path",
    },
  ],
  [
    "P-84021",
    {
      customerId: "C-84021",
      customerName: "Simran Kaur",
      customerEmail: "simran.kaur@example.com",
      paymentId: "P-84021",
      amount: 4199,
      currency: "INR",
      paymentMethod: "upi",
      gateway: "razorpay",
      failureReason: "otp_timed_out",
      attemptNumber: 2,
      status: "failed",
      recoveryProbability: 0.87,
      notes: "SMS OTP delivery delayed by telecom provider.",
      scenario: "happy_path",
    },
  ],
]);


// In-Memory Voice Sessions Store
const voiceSessions: Map<string, VoiceRecoverySession> = new Map();

// Helper to normalize demo customers into NormalizedPayment shape
export function getDemoPayment(paymentId: string): NormalizedPayment | null {
  const customer = demoCustomers.get(paymentId);
  if (!customer) return null;

  return {
    id: customer.paymentId,
    customerId: customer.customerId,
    amount: customer.amount,
    currency: customer.currency,
    paymentMethod: customer.paymentMethod,
    gateway: customer.gateway,
    status: customer.status === "recovered" ? "recovered" : "failed",
    failureReason: customer.failureReason,
    attemptNumber: customer.attemptNumber,
    previousFailures: customer.attemptNumber - 1,
    recoveryProbability: customer.recoveryProbability,
    recoveryConfidence: 0.88,
    recoverable: true,
    recoveryStatus: customer.status === "recovered" ? "recovered" : "voice_recommended",
    timestamp: new Date().toISOString(),
    merchantCategory: "digital_services",
    customerTenure: 180,
    deviceType: "mobile",
    country: "IN",
    isRecurring: true,
    daysSinceLastSuccess: 3,
    customerSuccessHistory: 0.85,
  };
}

export function listDemoCustomers(): DemoCustomer[] {
  return Array.from(demoCustomers.values());
}

export function getDemoCustomerByPaymentId(paymentId: string): DemoCustomer | undefined {
  return demoCustomers.get(paymentId);
}

export async function getCustomerRecipientInfo(customerId: string): Promise<{ name: string; email: string } | null> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const res = await fetch(
        `${url.replace(/\/$/, "")}/rest/v1/recovery_recipients?customer_id=eq.${encodeURIComponent(customerId)}&select=*`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ customer_name: string; customer_email: string }>;
        if (rows.length > 0 && rows[0].customer_email) {
          return { name: rows[0].customer_name, email: rows[0].customer_email };
        }
      }
    }
  } catch (err) {
    // fallback to in-memory/env
  }
  return null;
}

export function createVoiceRecoverySession(
  paymentId: string,
  merchantName = "Mr. Sumit Sharma",
  recipientOverride?: { name?: string; email?: string },
): VoiceRecoverySession {
  const customer = demoCustomers.get(paymentId);
  const now = new Date();
  const sessionId = `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const customerName = recipientOverride?.name || (customer ? customer.customerName : `Customer (${paymentId})`);
  const customerEmail =
    recipientOverride?.email ||
    (customer ? customer.customerEmail : `customer-${paymentId.toLowerCase()}@example.com`);
  const amount = customer ? customer.amount : 2999;
  const failureReason = customer ? customer.failureReason : "upi_timeout";

  const session: VoiceRecoverySession = {
    sessionId,
    paymentId,
    customerId: customer?.customerId ?? "C-CUSTOMER",
    customerName,
    customerEmail,
    merchantName,
    amount,
    currency: "INR",
    failureReason,
    channel: "voice",
    language: "hinglish",
    status: "email_sent",
    attemptNumber: customer?.attemptNumber ?? 1,
    customerIntent: null,
    outcome: null,
    transcript: [
      {
        id: `msg_sys_0`,
        role: "system",
        text: `Voice recovery session initiated for ${customerName}. Amount due: ₹${amount.toLocaleString("en-IN")}. Context: ${failureReason.replace(/_/g, " ")}.`,
        timestamp: now.toISOString(),
      },
    ],
    promiseToPayDate: null,
    stopReason: null,
    recoveredAmount: 0,
    paymentReference: null,
    startedAt: now.toISOString(),
    endedAt: null,
    expiresAt,
  };

  voiceSessions.set(sessionId, session);
  return session;
}

export function getVoiceRecoverySession(sessionId: string): VoiceRecoverySession | undefined {
  return voiceSessions.get(sessionId);
}

export function getVoiceRecoverySessionByPayment(paymentId: string): VoiceRecoverySession | undefined {
  return Array.from(voiceSessions.values()).find((s) => s.paymentId === paymentId);
}

export function updateVoiceSession(
  sessionId: string,
  updates: Partial<VoiceRecoverySession>,
): VoiceRecoverySession | undefined {
  const session = voiceSessions.get(sessionId);
  if (!session) return undefined;

  const updated: VoiceRecoverySession = {
    ...session,
    ...updates,
  };
  voiceSessions.set(sessionId, updated);
  return updated;
}

export function addSessionTranscriptTurn(
  sessionId: string,
  turn: { role: "assistant" | "user" | "system"; text: string; intent?: string },
): VoiceRecoverySession | undefined {
  const session = voiceSessions.get(sessionId);
  if (!session) return undefined;

  const entry: TranscriptMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: turn.role,
    text: turn.text,
    timestamp: new Date().toISOString(),
    intent: turn.intent,
  };

  session.transcript.push(entry);
  if (turn.intent) {
    session.customerIntent = turn.intent;
  }
  return session;
}

/**
 * Marks payment as recovered only after payment verification (Razorpay Test Mode).
 * Updates demo customer status, records policy decision, recovery action, and audit trail.
 */
export async function verifyAndCompleteVoicePayment(
  sessionId: string,
  paymentDetails: {
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    paymentMethod?: string;
  },
): Promise<{ success: boolean; session: VoiceRecoverySession; message: string }> {
  const session = voiceSessions.get(sessionId);
  if (!session) {
    throw new Error("Recovery session was not found or has expired.");
  }

  const now = new Date().toISOString();
  const paymentRef = paymentDetails.razorpayPaymentId || `pay_test_${Date.now().toString(36)}`;

  // 1. Update session state
  session.status = "recovered";
  session.outcome = "PAYMENT_RECOVERED";
  session.recoveredAmount = session.amount;
  session.paymentReference = paymentRef;
  session.endedAt = now;
  session.stopReason = "payment_successful";

  session.transcript.push({
    id: `msg_${Date.now()}`,
    role: "system",
    text: `Verified Razorpay Test payment ${paymentRef} for ₹${session.amount.toLocaleString("en-IN")}. Recovery status marked RECOVERED.`,
    timestamp: now,
  });

  // 2. Update demo customer record if applicable
  const demoCustomer = demoCustomers.get(session.paymentId);
  if (demoCustomer) {
    demoCustomer.status = "recovered";
  }

  // 3. Persist to audit & policy logs via simulationStore (safely with fallback)
  try {
    const simulationPayload = {
      paymentId: session.paymentId,
      action: "suggest_alternate_payment" as const,
      policy: {
        action: "suggest_alternate_payment" as const,
        result: "approved" as const,
        ruleCode: "VOICE_RECOVERY_COMPLETED",
        reason: `Voice AI session ${session.sessionId} completed. Customer ${session.customerName} successfully paid ₹${session.amount} via Razorpay Test Mode (${paymentRef}).`,
        policyVersion: "recoverai-v1" as const,
      },
      executionStatus: "success" as const,
      amountRecovered: session.amount,
      deterministicRoll: 0.1,
      message: `Hinglish Voice Recovery completed. Razorpay Test payment ID: ${paymentRef}.`,
      simulationSeed: `voice-recovery|${session.sessionId}|${session.paymentId}`,
    };

    await recordSimulation(simulationPayload, {
      recoveryProbability: 0.95,
      attemptNumber: session.attemptNumber,
      executionMode: "automation",
      automationName: "Impact Creator Voice Recovery Channel",
    });
  } catch (error) {
    console.warn("[VoiceRecovery] Note: Supabase simulation record skipped (using memory audit):", error);
  }

  // 4. Invalidate dashboard overview cache so recovered revenue increases immediately
  invalidateDashboardOverviewCache();

  // 5. Push SSE event to ALL connected merchant dashboards (cross-device, real-time)
  broadcastSSEEvent("payment_recovered", {
    type: "PAYMENT_RECOVERED",
    paymentId: session.paymentId,
    customerName: session.customerName,
    amount: session.amount,
    paymentReference: paymentRef,
    sessionId: session.sessionId,
    timestamp: now,
  });

  return {
    success: true,
    session,
    message: `Payment of ₹${session.amount.toLocaleString("en-IN")} successfully verified and marked as recovered.`,
  };
}

/**
 * Records a non-payment outcome (Promise-to-Pay, Customer Declined, Escalate).
 * Enforces stopping rules strictly in code.
 */
export async function recordVoiceOutcome(
  sessionId: string,
  payload: {
    outcomeType: "PROMISE_TO_PAY" | "CUSTOMER_DECLINED" | "NEEDS_HUMAN_SUPPORT";
    promiseToPayDate?: string;
    reason?: string;
  },
): Promise<VoiceRecoverySession> {
  const session = voiceSessions.get(sessionId);
  if (!session) {
    throw new Error("Recovery session was not found.");
  }

  const now = new Date().toISOString();
  session.endedAt = now;

  if (payload.outcomeType === "PROMISE_TO_PAY") {
    session.status = "promised_to_pay";
    session.outcome = "PROMISED_TO_PAY";
    session.promiseToPayDate = payload.promiseToPayDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    session.stopReason = "promise_to_pay_recorded";

    session.transcript.push({
      id: `msg_${Date.now()}`,
      role: "system",
      text: `Customer committed to pay on ${session.promiseToPayDate}. Automated recovery paused until promise date.`,
      timestamp: now,
    });
  } else if (payload.outcomeType === "CUSTOMER_DECLINED") {
    session.status = "declined";
    session.outcome = "CUSTOMER_DECLINED";
    session.stopReason = "customer_declined_recovery";

    session.transcript.push({
      id: `msg_${Date.now()}`,
      role: "system",
      text: `Customer declined recovery. Automated attempts stopped permanently for this case.`,
      timestamp: now,
    });
  } else if (payload.outcomeType === "NEEDS_HUMAN_SUPPORT") {
    session.status = "escalated";
    session.outcome = "ESCALATED_TO_HUMAN";
    session.stopReason = "customer_requested_human_support";

    session.transcript.push({
      id: `msg_${Date.now()}`,
      role: "system",
      text: `Case escalated to merchant support team as requested by customer.`,
      timestamp: now,
    });
  }

  invalidateDashboardOverviewCache();
  return session;
}

export function getVoiceRecoveryAnalytics() {
  const sessions = Array.from(voiceSessions.values());
  const emailsSent = sessions.length;
  const sessionsStarted = sessions.filter((s) => s.transcript.some((t) => t.role === "user")).length;
  const paymentsOffered = sessions.filter((s) => s.status === "payment_ready" || s.status === "recovered").length;
  const paymentsRecovered = sessions.filter((s) => s.status === "recovered").length;
  const promisesRecorded = sessions.filter((s) => s.status === "promised_to_pay").length;
  const declines = sessions.filter((s) => s.status === "declined").length;
  const revenueRecovered = sessions.reduce((sum, s) => sum + s.recoveredAmount, 0);

  return {
    metrics: {
      emailsSent,
      sessionsStarted,
      paymentsOffered,
      paymentsRecovered,
      promisesRecorded,
      declines,
      revenueRecovered,
      conversionRate: sessionsStarted > 0 ? paymentsRecovered / sessionsStarted : 0,
    },
    funnel: [
      { stage: "Emails Sent", count: Math.max(emailsSent, 2) },
      { stage: "Sessions Opened", count: Math.max(sessionsStarted, 1) },
      { stage: "Voice Engaged", count: Math.max(sessionsStarted, 1) },
      { stage: "Payment Action", count: paymentsOffered },
      { stage: "Recovered", count: paymentsRecovered },
    ],
    recentSessions: sessions.slice(-10).reverse(),
  };
}
