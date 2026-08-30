import type { RecoveryIntelligence } from "../domain/recoveryEngine";
import type { NormalizedPayment } from "../data/supabaseData";

export type GeminiRecoveryExplanation = {
  provider: "gemini";
  model: "gemini-3.6-flash";
  diagnosisSummary: string;
  businessExplanation: string;
  riskNote: string;
  deterministicRecommendation: {
    action: RecoveryIntelligence["recommendedAction"];
    policyResult: RecoveryIntelligence["candidates"][number]["policy"]["result"];
    ruleCode: string;
    reason: string;
  };
};

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };

const geminiSchema = {
  type: "OBJECT",
  properties: {
    diagnosisSummary: { type: "STRING", description: "A concise 1-sentence business diagnosis, maximum 180 characters." },
    businessExplanation: { type: "STRING", description: "A concise 2-sentence business explanation, maximum 320 characters. It must not promise a recovery outcome." },
    riskNote: { type: "STRING", description: "A short safety or uncertainty note, maximum 160 characters." },
  },
  required: ["diagnosisSummary", "businessExplanation", "riskNote"],
  propertyOrdering: ["diagnosisSummary", "businessExplanation", "riskNote"],
};

function asConciseString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "Unavailable.";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength) || "Unavailable.";
}

export async function generateGeminiRecoveryExplanation(payment: NormalizedPayment, intelligence: RecoveryIntelligence): Promise<GeminiRecoveryExplanation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured server-side.");
  const deterministicCandidate = intelligence.candidates.find(candidate => candidate.action === intelligence.recommendedAction);
  if (!deterministicCandidate) throw new Error("Deterministic recovery candidate was unavailable.");

  const safeContext = {
    payment: {
      amountInr: payment.amount,
      paymentMethod: payment.paymentMethod,
      gateway: payment.gateway,
      failureReason: payment.failureReason ?? "unknown",
      attemptNumber: payment.attemptNumber,
      isRecurring: payment.isRecurring,
    },
    model: {
      recoveryProbability: Number(intelligence.recoveryProbability.toFixed(4)),
      expectedRecoveryValueInr: Number(intelligence.expectedRecoveryValue.toFixed(2)),
      selectedThreshold: intelligence.model.selectedThreshold,
    },
    deterministicPolicy: {
      action: deterministicCandidate.action,
      result: deterministicCandidate.policy.result,
      ruleCode: deterministicCandidate.policy.ruleCode,
      reason: deterministicCandidate.policy.reason,
    },
  };

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are ReVora's conservative business explanation assistant. Explain only the structured payment context you receive. Never propose a different action, never claim to execute a payment, never guarantee recovery, never add customer personal data, and never reveal hidden reasoning. The deterministic policy remains the authority; your role is concise plain-language explanation only." }] },
      contents: [{ role: "user", parts: [{ text: `Create the requested JSON explanation for this deterministic recovery decision:\n${JSON.stringify(safeContext)}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "minimal" }, responseMimeType: "application/json", responseJsonSchema: geminiSchema },
    }),
  });
  if (!response.ok) throw new Error(`Gemini explanation request failed with ${response.status}.`);
  const payload = await response.json() as GeminiResponse;
  const content = payload.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? "").join("") ?? "";
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("Gemini returned an invalid structured explanation."); }
  const explanation = parsed as Record<string, unknown>;

  return {
    provider: "gemini",
    model: "gemini-3.6-flash",
    diagnosisSummary: asConciseString(explanation.diagnosisSummary, 180),
    businessExplanation: asConciseString(explanation.businessExplanation, 320),
    riskNote: asConciseString(explanation.riskNote, 160),
    deterministicRecommendation: { action: deterministicCandidate.action, policyResult: deterministicCandidate.policy.result, ruleCode: deterministicCandidate.policy.ruleCode, reason: deterministicCandidate.policy.reason },
  };
}
