import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc.js";
import { buildRecoveryIntelligence, isManualSimulationOutcomeAllowed, manualSimulationOutcomes, recoveryActions, simulateManualRecovery, simulateRecovery } from "./recovery/domain/recoveryEngine.js";
import { predictPaymentRecoveryProbability } from "./recovery/domain/model/modelPredictor.js";
import { getPolicyDecisionsForPayment } from "./recovery/data/policyData.js";
import { getOperationsCenter } from "./recovery/data/operationsData.js";
import { recordSimulation } from "./recovery/data/simulationStore.js";
import { generateGeminiRecoveryExplanation } from "./recovery/ai/geminiRecommendation.js";
import { generateGeminiMerchantAssistantAnswer } from "./recovery/ai/geminiMerchantAssistant.js";
import { getAnalyticsOverview, getDashboardOverview, getPaymentById, getPaymentDetail, invalidateDashboardOverviewCache, listPayments } from "./recovery/data/supabaseData.js";
import { getInvoiceDashboard, getInvoiceDetail, getInvoiceRiskInput, getPromiseTracker, listInvoices } from "./recovery/data/invoiceData.js";
import { invoiceRecoveryActions, simulateInvoiceRecovery } from "./recovery/domain/invoiceRecoveryEngine.js";
import { recordInvoiceSimulation } from "./recovery/data/invoiceSimulationStore.js";
import { generateGeminiInvoiceExplanation } from "./recovery/ai/geminiInvoiceRecommendation.js";
import { simulateAutomationRecovery, simulateOverdueInvoiceAutomation } from "./recovery/domain/automationSimulation.js";
import {
  addSessionTranscriptTurn,
  createVoiceRecoverySession,
  getCustomerRecipientInfo,
  getDemoCustomerByPaymentId,
  getVoiceRecoveryAnalytics,
  getVoiceRecoverySession,
  getVoiceRecoverySessionByPayment,
  listDemoCustomers,
  recordVoiceOutcome,
  updateVoiceSession,
  verifyAndCompleteVoicePayment,
} from "./recovery/data/voiceRecoveryStore.js";
import { processGeminiVoiceTurn } from "./recovery/ai/geminiVoiceRecovery.js";
import { sendRecoveryEmail } from "./recovery/data/emailService.js";
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from "./recovery/data/razorpayService.js";

const manualSimulationInput = z.object({
  paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(recoveryActions),
  outcome: z.enum(manualSimulationOutcomes),
  operatorNote: z.string().trim().max(240).regex(/^[A-Za-z0-9 .,;:()'/-]*$/).optional(),
}).superRefine((input, context) => {
  if (!isManualSimulationOutcomeAllowed(input.action, input.outcome)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["outcome"], message: "The selected outcome is not valid for this recovery action." });
  }
});

const automationSimulationInput = z.object({
  automationId: z.string().trim().min(4).max(80).regex(/^auto_[A-Za-z0-9_-]+$/),
  automationName: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9 .,'&()/-]+$/),
  paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(recoveryActions),
});

const invoiceAutomationSimulationInput = z.object({
  automationId: z.string().trim().min(4).max(80).regex(/^auto_[A-Za-z0-9_-]+$/),
  automationName: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9 .,'&()/-]+$/),
  invoiceId: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(recoveryActions),
});

export const appRouter = router({
  analytics: router({
    overview: publicProcedure.input(z.object({ range: z.enum(["7D", "30D", "90D", "12M"]).default("30D") }).optional()).query(({ input }) => getAnalyticsOverview(input?.range ?? "30D")),
  }),
  recovery: router({
    dashboard: publicProcedure.input(z.object({ range: z.enum(["7D", "30D", "90D", "12M"]).default("30D") }).optional()).query(({ input }) => getDashboardOverview(input?.range ?? "30D")),
    payments: publicProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
      search: z.string().trim().max(40).regex(/^[A-Za-z0-9 -]*$/).optional(),
      customerId: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
      status: z.string().trim().max(30).regex(/^[A-Za-z_ -]+$/).optional(),
      failureReason: z.string().trim().max(50).regex(/^[A-Za-z_ -]+$/).optional(),
      paymentMethod: z.string().trim().max(30).regex(/^[A-Za-z_ -]+$/).optional(),
      sort: z.enum(["newest", "oldest", "amount_desc", "probability_desc"]).default("newest"),
    })).query(({ input }) => listPayments(input)),
    paymentDetail: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    })).query(({ input }) => getPaymentDetail(input.paymentId)),
    intelligence: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    })).query(async ({ input }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) return null;
      return buildRecoveryIntelligence(payment);
    }),
    policyDecisions: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    })).query(({ input }) => getPolicyDecisionsForPayment(input.paymentId)),
    operationsCenter: publicProcedure.query(() => getOperationsCenter()),
    whatIf: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
      action: z.enum(recoveryActions).optional(),
      amount: z.number().min(0).max(1_000_000).optional(),
      recoveryProbability: z.number().min(0).max(1).optional(),
      attemptNumber: z.number().int().min(1).max(10).optional(),
    })).query(async ({ input }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) return null;
      const scenario = { ...payment, amount: input.amount ?? payment.amount, attemptNumber: input.attemptNumber ?? payment.attemptNumber };
      const intelligence = buildRecoveryIntelligence(scenario, input.recoveryProbability);
      const action = input.action ?? intelligence.recommendedAction;
      return { scenario: { amount: scenario.amount, recoveryProbability: intelligence.recoveryProbability, attemptNumber: scenario.attemptNumber }, intelligence, preview: simulateRecovery({ ...scenario, recoveryProbability: intelligence.recoveryProbability }, action) };
    }),
    geminiExplanation: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    })).mutation(async ({ input }) => {
      const payment = await getPaymentById(input.paymentId);
      if (!payment) throw new Error("Payment was not found in the synthetic Supabase dataset.");
      const intelligence = buildRecoveryIntelligence(payment);
      return generateGeminiRecoveryExplanation(payment, intelligence);
    }),
    merchantAssistant: publicProcedure.input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(600),
      })).min(1).max(6),
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
    })).mutation(async ({ input }) => {
      const [dashboard, operations, detail] = await Promise.all([
        getDashboardOverview("30D"),
        getOperationsCenter(),
        input.paymentId ? getPaymentDetail(input.paymentId) : Promise.resolve(null),
      ]);
      if (input.paymentId && !detail) throw new Error("Payment was not found in the synthetic Supabase dataset.");
      const intelligence = detail ? buildRecoveryIntelligence(detail.payment) : undefined;
      return generateGeminiMerchantAssistantAnswer(input.messages, {
        dashboard: {
          range: "30D",
          metrics: dashboard.metrics,
          opportunity: dashboard.opportunity,
          leadingFailure: dashboard.aiInsight ? { reason: dashboard.aiInsight.failureReason, affectedPayments: dashboard.aiInsight.affectedPayments, recoverableRevenue: dashboard.aiInsight.recoverableRevenue } : null,
        },
        operations: {
          autopilot: { maxAmount: operations.autopilot.maxAmount, minProbability: operations.autopilot.minProbability, maxRetryAttempt: operations.autopilot.maxRetryAttempt, eligibleCount: operations.autopilot.eligibleCount },
          playbooks: operations.playbooks.slice(0, 5).map(item => ({ action: item.action, cases: item.cases, expectedValue: Number(item.expectedValue.toFixed(2)), recoveryRate: Number(item.recoveryRate.toFixed(4)) })),
          auditEventCount: operations.auditEvents.length,
        },
        payment: detail && intelligence ? {
          payment: detail.payment,
          intelligence,
          recoveryCase: detail.recoveryCase ? { status: detail.recoveryCase.status, diagnosis: detail.recoveryCase.diagnosis, recommendation: detail.recoveryCase.recommendation } : null,
        } : undefined,
      });
    }),
    simulate: publicProcedure.input(z.object({
      paymentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
      action: z.enum(recoveryActions),
    })).mutation(async ({ input }) => {
      const detail = await getPaymentDetail(input.paymentId);
      if (!detail) throw new Error("Payment was not found in the synthetic Supabase dataset.");
      const scoredPayment = { ...detail.payment, recoveryProbability: predictPaymentRecoveryProbability(detail.payment) };
      const simulation = simulateRecovery(scoredPayment, input.action);
      const persisted = await recordSimulation(simulation, {
        recoveryProbability: scoredPayment.recoveryProbability,
        attemptNumber: scoredPayment.attemptNumber,
        recoveryCaseId: detail.recoveryCase?.id,
      });
      invalidateDashboardOverviewCache();
      return { simulation, persisted };
    }),
    manualSimulate: publicProcedure.input(manualSimulationInput).mutation(async ({ input }) => {
      const detail = await getPaymentDetail(input.paymentId);
      if (!detail) throw new Error("Payment was not found in the synthetic Supabase dataset.");
      const scoredPayment = { ...detail.payment, recoveryProbability: predictPaymentRecoveryProbability(detail.payment) };
      const simulation = simulateManualRecovery(scoredPayment, input.action, input.outcome);
      if (simulation.policy.result !== "approved") throw new Error(`Manual simulation was not recorded: ${simulation.policy.reason}`);
      const persisted = await recordSimulation(simulation, {
        recoveryProbability: scoredPayment.recoveryProbability,
        attemptNumber: scoredPayment.attemptNumber,
        recoveryCaseId: detail.recoveryCase?.id,
        executionMode: "manual",
        operatorNote: input.operatorNote,
      });
      invalidateDashboardOverviewCache();
      return { simulation, persisted };
    }),
    automationSimulate: publicProcedure.input(automationSimulationInput).mutation(async ({ input }) => {
      const detail = await getPaymentDetail(input.paymentId);
      if (!detail) throw new Error("Payment was not found in the synthetic Supabase dataset.");
      const scoredPayment = { ...detail.payment, recoveryProbability: predictPaymentRecoveryProbability(detail.payment) };
      const automation = simulateAutomationRecovery(scoredPayment, input.action);
      const persisted = await recordSimulation(automation.simulation as import("./recovery/domain/recoveryEngine.js").SimulationResult, {
        recoveryProbability: scoredPayment.recoveryProbability,
        attemptNumber: scoredPayment.attemptNumber,
        recoveryCaseId: detail.recoveryCase?.id,
        executionMode: "automation",
        automationName: input.automationName,
      });
      invalidateDashboardOverviewCache();
      return { automation, persisted };
    }),
    automationInvoiceSimulate: publicProcedure.input(invoiceAutomationSimulationInput).mutation(async ({ input }) => {
      const context = await getInvoiceRiskInput(input.invoiceId);
      if (!context) throw new Error("Overdue invoice was not found in the configured Supabase receivables source.");
      const automation = simulateOverdueInvoiceAutomation(context.input, input.action);
      const persisted = await recordInvoiceSimulation(automation.simulation as import("./recovery/domain/invoiceRecoveryEngine.js").InvoiceSimulationResult, {
        recoveryProbability: context.invoice.recoveryProbability,
        outstandingAmount: context.invoice.outstandingAmount,
        executionMode: "automation",
        automationName: input.automationName,
      });
      invalidateDashboardOverviewCache();
      return { automation, persisted };
    }),

    voice: router({
      listDemoCustomers: publicProcedure.query(() => listDemoCustomers()),
      createSession: publicProcedure
        .input(
          z.object({
            paymentId: z.string().trim().min(1).max(64),
            merchantName: z.string().trim().max(80).optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const customer = getDemoCustomerByPaymentId(input.paymentId);
          const recipientInfo = customer ? await getCustomerRecipientInfo(customer.customerId) : null;

          console.log(`[VoiceRouter] createSession paymentId=${input.paymentId} customerId=${customer?.customerId} supabaseEmail=${recipientInfo?.email ?? "NOT FOUND — using fallback"}`);

          const session = createVoiceRecoverySession(
            input.paymentId,
            input.merchantName,
            recipientInfo ? { name: recipientInfo.name, email: recipientInfo.email } : undefined,
          );
          const recoveryUrl = `/recover/${session.sessionId}`;
          const directPayUrl = `/recover/${session.sessionId}?mode=direct`;

          const emailResult = await sendRecoveryEmail({
            to: session.customerEmail,
            recipientName: session.customerName,
            amount: session.amount,
            currency: session.currency,
            failureReason: session.failureReason,
            merchantName: session.merchantName,
            recoveryUrl,
            directPayUrl,
            sessionId: session.sessionId,
          });

          const emailPreview = {
            subject: emailResult.subject,
            recipientName: session.customerName,
            recipientEmail: session.customerEmail,
            amount: session.amount,
            failureReason: session.failureReason,
            merchantName: session.merchantName,
            recoveryUrl,
            directPayUrl,
            sessionId: session.sessionId,
            deliveredVia: emailResult.deliveredVia,
            messageId: emailResult.messageId,
            bodyText: emailResult.textContent,
          };

          return { session, emailPreview };
        }),
      getSession: publicProcedure
        .input(z.object({ sessionId: z.string().trim().min(1) }))
        .query(({ input }) => {
          const session = getVoiceRecoverySession(input.sessionId);
          if (!session) return null;
          return {
            sessionId: session.sessionId,
            paymentId: session.paymentId,
            customerName: session.customerName,
            customerEmail: session.customerEmail,
            merchantName: session.merchantName,
            amount: session.amount,
            currency: session.currency,
            failureReason: session.failureReason,
            status: session.status,
            language: session.language,
            transcript: session.transcript,
            promiseToPayDate: session.promiseToPayDate,
            recoveredAmount: session.recoveredAmount,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
          };
        }),
      sendTurn: publicProcedure
        .input(
          z.object({
            sessionId: z.string().trim().min(1),
            userInput: z.string().trim().min(1).max(800),
          }),
        )
        .mutation(async ({ input }) => {
          const session = getVoiceRecoverySession(input.sessionId);
          if (!session) throw new Error("Recovery session not found.");

          addSessionTranscriptTurn(input.sessionId, {
            role: "user",
            text: input.userInput,
          });

          const turnResult = await processGeminiVoiceTurn(session, input.userInput);

          addSessionTranscriptTurn(input.sessionId, {
            role: "assistant",
            text: turnResult.replyText,
            intent: turnResult.intent,
          });

          if (turnResult.action === "OFFER_PAYMENT") {
            updateVoiceSession(input.sessionId, { status: "payment_ready", customerIntent: turnResult.intent });
          } else if (turnResult.action === "STOP_RECOVERY") {
            await recordVoiceOutcome(input.sessionId, { outcomeType: "CUSTOMER_DECLINED", reason: turnResult.actionPayload?.reason });
          } else if (turnResult.action === "COLLECT_PROMISE_DATE") {
            await recordVoiceOutcome(input.sessionId, { outcomeType: "PROMISE_TO_PAY", promiseToPayDate: turnResult.actionPayload?.promiseDate });
          } else if (turnResult.action === "ESCALATE_HUMAN") {
            await recordVoiceOutcome(input.sessionId, { outcomeType: "NEEDS_HUMAN_SUPPORT", reason: turnResult.actionPayload?.reason });
          }

          const updatedSession = getVoiceRecoverySession(input.sessionId);
          return { turnResult, session: updatedSession };
        }),
      createPaymentOrder: publicProcedure
        .input(z.object({ sessionId: z.string().trim().min(1) }))
        .mutation(async ({ input }) => {
          const session = getVoiceRecoverySession(input.sessionId);
          if (!session) throw new Error("Recovery session not found.");
          const order = await createRazorpayOrder({
            amount: session.amount,
            currency: session.currency,
            receipt: session.sessionId,
            notes: {
              customerName: session.customerName,
              paymentId: session.paymentId,
            },
          });
          return { order, session };
        }),
      verifyPayment: publicProcedure
        .input(
          z.object({
            sessionId: z.string().trim().min(1),
            razorpayPaymentId: z.string().min(1, "Razorpay payment ID is required"),
            razorpayOrderId: z.string().min(1, "Razorpay order ID is required"),
            razorpaySignature: z.string().min(1, "Razorpay signature is required"),
            paymentMethod: z.string().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const isValid = verifyRazorpayPaymentSignature({
            razorpayOrderId: input.razorpayOrderId,
            razorpayPaymentId: input.razorpayPaymentId,
            razorpaySignature: input.razorpaySignature,
          });

          if (!isValid) {
            throw new Error("Razorpay payment signature verification failed. Payment cannot be marked successful.");
          }

          return verifyAndCompleteVoicePayment(input.sessionId, {
            razorpayPaymentId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            paymentMethod: input.paymentMethod || "razorpay_standard_checkout",
          });
        }),

      recordOutcome: publicProcedure
        .input(
          z.object({
            sessionId: z.string().trim().min(1),
            outcomeType: z.enum(["PROMISE_TO_PAY", "CUSTOMER_DECLINED", "NEEDS_HUMAN_SUPPORT"]),
            promiseToPayDate: z.string().optional(),
            reason: z.string().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          return recordVoiceOutcome(input.sessionId, input);
        }),
      analytics: publicProcedure.query(() => getVoiceRecoveryAnalytics()),
    }),
  }),

  invoices: router({
    dashboard: publicProcedure.query(() => getInvoiceDashboard()),
    list: publicProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
      search: z.string().trim().max(80).regex(/^[A-Za-z0-9 _-]*$/).optional(),
      status: z.enum(["draft", "open", "partially_paid", "paid", "written_off", "disputed", "cancelled", "unknown"]).optional(),
      risk: z.enum(["low", "medium", "high"]).optional(),
      overdueOnly: z.boolean().optional(),
    })).query(({ input }) => listInvoices(input)),
    detail: publicProcedure.input(z.object({ invoiceId: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/) })).query(({ input }) => getInvoiceDetail(input.invoiceId)),
    promises: publicProcedure.input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
      status: z.enum(["active", "kept", "missed", "cancelled", "unknown"]).optional(),
    })).query(({ input }) => getPromiseTracker(input)),
    geminiAnalysis: publicProcedure.input(z.object({ invoiceId: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/) })).mutation(async ({ input }) => {
      const detail = await getInvoiceDetail(input.invoiceId);
      if (!detail.invoice || !detail.intelligence) throw new Error("Invoice was not found in the configured Supabase receivables source.");
      return generateGeminiInvoiceExplanation(detail.invoice, detail.intelligence);
    }),
    simulate: publicProcedure.input(z.object({
      invoiceId: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
      action: z.enum(invoiceRecoveryActions),
      promise: z.object({
        promisedAmount: z.number().positive().max(1_000_000),
        promisedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).optional(),
    })).mutation(async ({ input }) => {
      const context = await getInvoiceRiskInput(input.invoiceId);
      if (!context) throw new Error("Invoice was not found in the configured Supabase receivables source.");
      const simulation = simulateInvoiceRecovery(context.input, input.action, input.promise);
      const persisted = await recordInvoiceSimulation(simulation, { recoveryProbability: context.invoice.recoveryProbability, outstandingAmount: context.invoice.outstandingAmount, promise: input.promise });
      return { simulation, persisted };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
