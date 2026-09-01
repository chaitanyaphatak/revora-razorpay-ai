import type { VoiceRecoverySession } from "../data/voiceRecoveryStore.js";

export type VoiceTurnIntent =
  | "RETRY_PAYMENT"
  | "PAYMENT_METHOD_PROBLEM"
  | "PROMISE_TO_PAY"
  | "CUSTOMER_DECLINED"
  | "NEEDS_HUMAN_SUPPORT"
  | "GENERAL_QUERY"
  | "UNKNOWN";

export type VoiceTurnAction =
  | "OFFER_PAYMENT"
  | "COLLECT_PROMISE_DATE"
  | "STOP_RECOVERY"
  | "ESCALATE_HUMAN"
  | "EXPLAIN_CONTEXT"
  | "CONTINUE_CONVERSATION";

export type VoiceTurnResponse = {
  replyText: string;
  intent: VoiceTurnIntent;
  action: VoiceTurnAction;
  actionPayload?: {
    suggestedPaymentMethod?: string;
    promiseDate?: string;
    reason?: string;
  };
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
};

const geminiVoiceSchema = {
  type: "OBJECT",
  properties: {
    replyText: {
      type: "STRING",
      description: "Polite, empathetic, natural Hinglish reply (1-3 sentences) suitable for speech output.",
    },
    intent: {
      type: "STRING",
      enum: [
        "RETRY_PAYMENT",
        "PAYMENT_METHOD_PROBLEM",
        "PROMISE_TO_PAY",
        "CUSTOMER_DECLINED",
        "NEEDS_HUMAN_SUPPORT",
        "GENERAL_QUERY",
        "UNKNOWN",
      ],
      description: "Classified user intent from this turn.",
    },
    action: {
      type: "STRING",
      enum: [
        "OFFER_PAYMENT",
        "COLLECT_PROMISE_DATE",
        "STOP_RECOVERY",
        "ESCALATE_HUMAN",
        "EXPLAIN_CONTEXT",
        "CONTINUE_CONVERSATION",
      ],
      description: "System recovery action recommended based on intent.",
    },
    actionPayload: {
      type: "OBJECT",
      properties: {
        suggestedPaymentMethod: { type: "STRING" },
        promiseDate: { type: "STRING" },
        reason: { type: "STRING" },
      },
    },
  },
  required: ["replyText", "intent", "action"],
};

export async function processGeminiVoiceTurn(
  session: VoiceRecoverySession,
  userInput: string,
): Promise<VoiceTurnResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback intelligent heuristic in case API key is absent or offline
  const generateFallbackResponse = (): VoiceTurnResponse => {
    const input = userInput.toLowerCase();

    if (input.includes("pay") || input.includes("karna hai") || input.includes("link") || input.includes("retry") || input.includes("karein") || input.includes("kese")) {
      return {
        replyText: `Haan ji bilkul! Main aapke screen par secure Razorpay payment link activate kar raha hoon. Aap bina kisi extra charge ke Card ya alternative UPI se complete kar sakte hain.`,
        intent: "RETRY_PAYMENT",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    if (input.includes("upi") || input.includes("failed") || input.includes("server") || input.includes("timeout") || input.includes("paise cut")) {
      return {
        replyText: `Aapka issue bilkul samajh gaya. Kabhi-kabhi bank ke UPI server timeout ho jate hain. Aap chahein toh Card ya Netbanking se safely complete kar sakte hain. Kya main payment screen open karun?`,
        intent: "PAYMENT_METHOD_PROBLEM",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card" },
      };
    }

    if (input.includes("kal") || input.includes("baad me") || input.includes("later") || input.includes("salary") || input.includes("date") || input.includes("tarikh") || input.includes("tarik")) {
      return {
        replyText: `Koi baat nahi! Humne aapka Promise-to-Pay note kar liya hai. Hum tab tak automated reminders pause kar rahe hain. Thank you!`,
        intent: "PROMISE_TO_PAY",
        action: "COLLECT_PROMISE_DATE",
        actionPayload: { promiseDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
      };
    }

    if (input.includes("nahi") || input.includes("cancel") || input.includes("stop") || input.includes("don't") || input.includes("mat")) {
      return {
        replyText: `Ji theek hai, aapki request ke mutabiq humne recovery process yahin stop kar diya hai. Aapko aage koi reminder nahi aayega. Dhanyawaad!`,
        intent: "CUSTOMER_DECLINED",
        action: "STOP_RECOVERY",
        actionPayload: { reason: "customer_requested_cancellation" },
      };
    }

    if (input.includes("human") || input.includes("agent") || input.includes("support") || input.includes("executive") || input.includes("baat karao")) {
      return {
        replyText: `Zaroor! Main aapka case hamari support team ke executive ko escalate kar raha hoon. Wo jald hi aapse contact karenge.`,
        intent: "NEEDS_HUMAN_SUPPORT",
        action: "ESCALATE_HUMAN",
        actionPayload: { reason: "escalation_requested" },
      };
    }

    return {
      replyText: `Namaste ${session.customerName} ji! Main ReVora Sahayak hoon. ${session.merchantName} ke ₹${session.amount.toLocaleString("en-IN")} ke pending payment ke regarding aapse baat kar raha hoon. Kya main aapki payment complete karne mein help karun?`,
      intent: "GENERAL_QUERY",
      action: "EXPLAIN_CONTEXT",
    };
  };

  if (!apiKey) {
    return generateFallbackResponse();
  }

  const recentTranscript = session.transcript
    .filter((t) => t.role !== "system")
    .slice(-6)
    .map((t) => `${t.role === "assistant" ? "Assistant" : "Customer"}: ${t.text}`)
    .join("\n");

  const promptContext = {
    customerName: session.customerName,
    merchantName: session.merchantName,
    amount: session.amount,
    currency: session.currency,
    failureReason: session.failureReason,
    attemptNumber: session.attemptNumber,
    recentConversation: recentTranscript,
    latestCustomerInput: userInput,
  };

  const systemPrompt = `You are "ReVora Sahayak", an empathetic, intelligent, and highly professional AI Revenue Recovery Assistant for ${session.merchantName}.
You are speaking directly with customer ${session.customerName} regarding their at-risk/failed payment of ₹${session.amount.toLocaleString("en-IN")} (Issue: ${session.failureReason}).

LANGUAGE & TONE GUIDELINES:
- Speak naturally in warm, respectful **Hinglish** (natural Indian Hindi + English mix in Roman script, e.g. "Namaste Rahul ji, aapka ₹2,999 ka payment UPI glitch ki wajah se fail ho gaya tha...").
- Keep replies concise (1 to 2 sentences max) because this will be spoken aloud to the customer.
- Always be polite, respectful, and reassuring.

STRICT SECURITY & BUSINESS BOUNDARIES:
1. NEVER EVER ask for sensitive payment data (NO OTP, NO UPI PIN, NO CVV, NO card numbers, NO passwords).
2. NEVER claim payment is done until the payment gateway confirms it.
3. If customer wants to pay now -> Classify as RETRY_PAYMENT or PAYMENT_METHOD_PROBLEM and action OFFER_PAYMENT.
4. If customer says they will pay later (e.g. salary date, next week) -> Classify as PROMISE_TO_PAY, acknowledge warmly, action COLLECT_PROMISE_DATE.
5. If customer declines or asks to stop -> Classify as CUSTOMER_DECLINED, stop immediately, action STOP_RECOVERY.
6. If customer asks for a human -> Classify as NEEDS_HUMAN_SUPPORT, action ESCALATE_HUMAN.
7. Return ONLY valid JSON matching the requested schema.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [{ text: `Current recovery context and customer input:\n${JSON.stringify(promptContext)}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 350,
            thinkingConfig: { thinkingLevel: "minimal" },
            responseMimeType: "application/json",
            responseJsonSchema: geminiVoiceSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      console.warn(`[GeminiVoice] API responded with ${response.status}. Using fallback response.`);
      return generateFallbackResponse();
    }

    const payload = (await response.json()) as GeminiApiResponse;
    const content =
      payload.candidates?.[0]?.content?.parts
        ?.filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("") ?? "";

    const parsed = JSON.parse(content) as VoiceTurnResponse;
    return parsed;
  } catch (error) {
    console.warn("[GeminiVoice] Error executing Gemini request:", error);
    return generateFallbackResponse();
  }
}
