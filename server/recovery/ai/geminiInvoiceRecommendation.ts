import type { InvoiceSnapshot } from "../data/invoiceData.js";
import type { InvoiceRecoveryIntelligence } from "../domain/invoiceRecoveryEngine.js";

export type GeminiInvoiceExplanation = {
  provider: "gemini";
  model: "gemini-3.6-flash";
  diagnosisSummary: string;
  businessExplanation: string;
  riskNote: string;
  operatorNextStep: string;
  deterministicRecommendation: { action: InvoiceRecoveryIntelligence["recommendedAction"]; policyResult: InvoiceRecoveryIntelligence["candidates"][number]["policy"]["result"]; ruleCode: string; reason: string };
};

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };

const responseSchema = {
  type: "OBJECT",
  properties: {
    diagnosisSummary: { type: "STRING", description: "One concise invoice diagnosis, maximum 180 characters." },
    businessExplanation: { type: "STRING", description: "Two concise sentences explaining overdue risk and recovery probability, maximum 360 characters. Never promise recovery." },
    riskNote: { type: "STRING", description: "A short uncertainty or safety note, maximum 160 characters." },
    operatorNextStep: { type: "STRING", description: "One non-executing operator review step, maximum 180 characters. It must agree with deterministic policy." },
  },
  required: ["diagnosisSummary", "businessExplanation", "riskNote", "operatorNextStep"],
  propertyOrdering: ["diagnosisSummary", "businessExplanation", "riskNote", "operatorNextStep"],
};

function concise(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) || "Unavailable." : "Unavailable.";
}

export async function generateGeminiInvoiceExplanation(invoice: InvoiceSnapshot, intelligence: InvoiceRecoveryIntelligence): Promise<GeminiInvoiceExplanation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured server-side.");
  const candidate = intelligence.candidates.find(item => item.action === intelligence.recommendedAction);
  if (!candidate) throw new Error("Deterministic invoice recommendation was unavailable.");
  const safeContext = {
    invoice: { id: invoice.id, amount: invoice.amount, currency: invoice.currency, issuedDate: invoice.issuedDate, dueDate: invoice.dueDate, status: invoice.status, outstandingAmount: invoice.outstandingAmount, daysOverdue: invoice.daysOverdue },
    promiseToPay: invoice.activePromise ? { promisedAmount: invoice.activePromise.promisedAmount, promisedDate: invoice.activePromise.promisedDate, status: invoice.activePromise.status, missed: invoice.activePromise.isMissed } : "none",
    calculatedRecovery: { probability: intelligence.recoveryProbability, recoveryRisk: intelligence.recoveryRisk, expectedRecoveryValue: intelligence.expectedRecoveryValue, reasons: intelligence.reasons },
    deterministicPolicy: { action: candidate.action, result: candidate.policy.result, ruleCode: candidate.policy.ruleCode, reason: candidate.policy.reason },
  };
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are ReVora's conservative B2B receivables explanation assistant. Explain only the approved structured invoice context provided. The deterministic invoice policy is authoritative: do not select a different action, make a promise, contact a customer, change an invoice, collect payment, claim a recovery outcome, expose hidden reasoning, or reveal credentials. Give concise business language suitable for an operator reviewing a simulation-only workflow." }] },
      contents: [{ role: "user", parts: [{ text: `Create the requested JSON explanation for this deterministic receivables decision:\n${JSON.stringify(safeContext)}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 580, thinkingConfig: { thinkingLevel: "minimal" }, responseMimeType: "application/json", responseJsonSchema: responseSchema },
    }),
  });
  if (!response.ok) throw new Error(`Gemini invoice explanation request failed with ${response.status}.`);
  const payload = await response.json() as GeminiResponse;
  const content = payload.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? "").join("") ?? "";
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(content) as Record<string, unknown>; } catch { throw new Error("Gemini returned an invalid structured invoice explanation."); }
  return { provider: "gemini", model: "gemini-3.6-flash", diagnosisSummary: concise(parsed.diagnosisSummary, 180), businessExplanation: concise(parsed.businessExplanation, 360), riskNote: concise(parsed.riskNote, 160), operatorNextStep: concise(parsed.operatorNextStep, 180), deterministicRecommendation: { action: candidate.action, policyResult: candidate.policy.result, ruleCode: candidate.policy.ruleCode, reason: candidate.policy.reason } };
}
