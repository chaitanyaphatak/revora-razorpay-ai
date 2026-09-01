import type { VoiceRecoverySession } from "../data/voiceRecoveryStore.js";

export type VoiceTurnIntent =
  | "RETRY_PAYMENT"
  | "PAYMENT_METHOD_PROBLEM"
  | "ASK_FAILURE_REASON"
  | "PROMISE_TO_PAY"
  | "CUSTOMER_DECLINED"
  | "NEEDS_HUMAN_SUPPORT"
  | "GENERAL_QUERY"
  | "UNKNOWN";

export type VoiceTurnAction =
  | "OFFER_PAYMENT"
  | "OPEN_PAYMENT_GATEWAY"   // triggers Razorpay checkout immediately on client
  | "COLLECT_PROMISE_DATE"
  | "STOP_RECOVERY"
  | "ESCALATE_HUMAN"
  | "EXPLAIN_CONTEXT"
  | "CONTINUE_CONVERSATION";

export type VoiceTurnResponse = {
  replyText: string;
  intent: VoiceTurnIntent;
  action: VoiceTurnAction;
  openGateway?: boolean; // explicit flag: frontend should open Razorpay immediately
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
        "ASK_FAILURE_REASON",
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
        "OPEN_PAYMENT_GATEWAY",
        "OFFER_PAYMENT",
        "COLLECT_PROMISE_DATE",
        "STOP_RECOVERY",
        "ESCALATE_HUMAN",
        "EXPLAIN_CONTEXT",
        "CONTINUE_CONVERSATION",
      ],
      description: "System recovery action. Use OPEN_PAYMENT_GATEWAY when customer explicitly says to pay now / send link / retry. Use OFFER_PAYMENT when gently suggesting but not confirmed.",
    },
    openGateway: {
      type: "BOOLEAN",
      description: "Set true ONLY when action is OPEN_PAYMENT_GATEWAY — tells frontend to open Razorpay checkout immediately.",
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

  // Human-readable failure reason for Hinglish explanations
  const failureExplanations: Record<string, string> = {
    upi_timeout: "aapka UPI transaction bank server ki taraf se timeout ho gaya tha — matlab network lag ke wajah se payment complete nahi hui, paise cut nahi hue",
    bank_server_down: "jis waqt aapne pay kiya tab HDFC bank ka core server kuch seconds ke liye down tha — yeh ek technical glitch tha, koi fault aapka nahi tha",
    insufficient_funds: "payment ke waqt account mein balance thoda kam tha jis ki wajah se transaction decline hua",
    network_drop: "3D Secure OTP aane se pehle hi mobile data disconnect ho gaya tha jis se payment session expire ho gayi",
    daily_limit_exceeded: "aapki aaj ki UPI daily limit puri ho chuki thi, isliye transaction nahi hua — Card ya Netbanking se koi limit nahi hai",
    upi_pin_retry_limit: "UPI PIN galat enter hone ki wajah se aapka account temporarily lock ho gaya tha — ab fresh payment link par koi problem nahi aayegi",
    card_security_block: "bank ne ek high-value transaction detect karke security ke liye payment temporarily block kar di thi — yeh aapki protection ke liye tha",
    gateway_timeout: "payment gateway ne checkout process ke beech ek network timeout detect kiya — server-side issue tha, aapki koi galti nahi",
    card_expired: "aapka saved card expire ho gaya hai — aap ek naya card ya UPI se easily pay kar sakte hain",
    session_expired: "netbanking session kuch der ke liye idle raha jis ki wajah se session expire ho gayi aur payment nahi hui",
    otp_timed_out: "OTP SMS delivery mein delay hua aur OTP expire ho gaya tha — yeh telecom provider ki problem thi",
  };

  const failureExp = failureExplanations[session.failureReason] ??
    `payment ek technical issue ki wajah se fail hui thi — aapka koi paisa cut nahi hua`;

  // Fallback intelligent heuristic in case API key is absent or offline
  const generateFallbackResponse = (): VoiceTurnResponse => {
    const input = userInput.toLowerCase();

    // Customer asking WHY payment failed
    if (
      input.includes("kyun") || input.includes("kyu") || input.includes("why") ||
      input.includes("failed") || input.includes("fail") || input.includes("kya hua") ||
      input.includes("reason") || input.includes("problem") || input.includes("issue")
    ) {
      return {
        replyText: `${session.customerName} ji, ${failureExp}. Aapka koi paisa account se nahi gaya. Kya aap abhi secure link se retry karna chahenge?`,
        intent: "ASK_FAILURE_REASON",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    // Customer says pay now / send link / retry — open gateway directly
    if (
      input.includes("abhi pay") || input.includes("pay karta") || input.includes("payment link") ||
      input.includes("link bhejo") || input.includes("link do") || input.includes("link send") ||
      input.includes("retry") || input.includes("wapas try") || input.includes("dobara") ||
      input.includes("checkout") || input.includes("gateway") || input.includes("open karo") ||
      input.includes("open kar") || input.includes("pay kar") || input.includes("karlunga") ||
      input.includes("karna hai") || input.includes("karta hoon")
    ) {
      return {
        replyText: `Bilkul ${session.customerName} ji! Main abhi aapke liye secure Razorpay checkout open kar raha hoon — aap UPI, Card ya Netbanking se ₹${session.amount.toLocaleString("en-IN")} safely pay kar sakte hain.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    // Generic pay intent
    if (
      input.includes("pay") || input.includes("link") || input.includes("karein") ||
      input.includes("kese") || input.includes("haan") || input.includes("yes")
    ) {
      return {
        replyText: `Haan ji bilkul! Main aapke screen par secure Razorpay payment link activate kar raha hoon. Aap bina kisi extra charge ke Card ya alternative UPI se complete kar sakte hain.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    if (input.includes("upi") || input.includes("server") || input.includes("timeout") || input.includes("paise cut")) {
      return {
        replyText: `Samajh gaya! ${failureExp}. Aap chahein toh Card ya Netbanking se safely complete kar sakte hain — kya main payment screen abhi open karun?`,
        intent: "PAYMENT_METHOD_PROBLEM",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card" },
      };
    }

    if (
      input.includes("kal") || input.includes("baad me") || input.includes("later") ||
      input.includes("salary") || input.includes("date") || input.includes("tarikh") ||
      input.includes("tarik") || input.includes("week") || input.includes("mahine")
    ) {
      return {
        replyText: `Koi baat nahi ${session.customerName} ji! Humne aapka Promise-to-Pay note kar liya hai. Hum tab tak automated reminders pause kar rahe hain. Dhanyawaad!`,
        intent: "PROMISE_TO_PAY",
        action: "COLLECT_PROMISE_DATE",
        actionPayload: { promiseDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
      };
    }

    if (
      input.includes("nahi") || input.includes("cancel") || input.includes("stop") ||
      input.includes("don't") || input.includes("mat") || input.includes("nahi karna")
    ) {
      return {
        replyText: `Ji theek hai, aapki request ke mutabiq humne recovery process yahin stop kar diya hai. Aapko aage koi reminder nahi aayega. Dhanyawaad!`,
        intent: "CUSTOMER_DECLINED",
        action: "STOP_RECOVERY",
        actionPayload: { reason: "customer_requested_cancellation" },
      };
    }

    if (
      input.includes("human") || input.includes("agent") || input.includes("support") ||
      input.includes("executive") || input.includes("baat karao") || input.includes("insaan")
    ) {
      return {
        replyText: `Zaroor! Main aapka case hamari support team ke executive ko escalate kar raha hoon. Wo jald hi aapse contact karenge.`,
        intent: "NEEDS_HUMAN_SUPPORT",
        action: "ESCALATE_HUMAN",
        actionPayload: { reason: "escalation_requested" },
      };
    }

    return {
      replyText: `Namaste ${session.customerName} ji! Main ReVora Sahayak hoon. ${session.merchantName} ke ₹${session.amount.toLocaleString("en-IN")} ke pending payment ke regarding aapse baat kar raha hoon. ${failureExp}. Kya main aapki payment complete karne mein help karun?`,
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

  // Map failure reason to human-readable Hinglish explanation for the AI
  const failureExplanationForAI: Record<string, string> = {
    upi_timeout: "UPI transaction bank server ki wajah se timeout hua, paise nahi kate",
    bank_server_down: "HDFC bank core server momentarily down tha — technical glitch, customer ki galti nahi",
    insufficient_funds: "payment ke waqt account balance kam tha",
    network_drop: "3DS OTP ke dauran mobile data drop hua",
    daily_limit_exceeded: "aaj ki UPI daily limit puri thi",
    upi_pin_retry_limit: "wrong UPI PIN ki wajah se account temporarily lock tha",
    card_security_block: "bank ne high-value transaction security block kiya tha",
    gateway_timeout: "payment gateway network timeout — server issue tha",
    card_expired: "saved card expired ho gaya hai",
    session_expired: "netbanking session idle ho kar expire hua",
    otp_timed_out: "OTP delivery mein delay, OTP expire hua",
  };
  const failureNote = failureExplanationForAI[session.failureReason] ?? "technical issue ki wajah se payment fail hui";

  const systemPrompt = `You are "ReVora Sahayak", an empathetic, intelligent, and highly professional AI Revenue Recovery Assistant for ${session.merchantName}.
You are speaking directly with customer ${session.customerName} about their failed payment of ₹${session.amount.toLocaleString("en-IN")}.

FAILURE CONTEXT (explain this when asked): ${failureNote}. Koi paisa account se nahi gaya.

LANGUAGE & TONE GUIDELINES:
- Speak naturally in warm Hinglish (Hindi + English Roman script). Example: "Namaste Rahul ji, aapka payment UPI glitch ki wajah se fail hua tha — koi paisa nahi kata."
- Keep replies concise (2 sentences max) — this is spoken aloud.
- Always be polite, respectful, and reassuring.
- If customer asks why payment failed (kyu, kyun, failed, reason, kya hua) — explain the failure clearly in Hinglish using FAILURE CONTEXT above, then offer to retry.

ACTION RULES (follow strictly):
1. Customer says: "pay karna hai", "link do", "link bhejo", "retry", "wapas try", "checkout open karo", "abhi pay", "payment karta hoon", "haan" (yes after offer) → action: OPEN_PAYMENT_GATEWAY, openGateway: true
2. Customer asks failure reason but doesn't confirm payment yet → action: OFFER_PAYMENT (gentle), intent: ASK_FAILURE_REASON
3. Customer says pay later / salary date / kal / next week → action: COLLECT_PROMISE_DATE
4. Customer declines / stop / nahi / mat → action: STOP_RECOVERY
5. Customer asks for human / agent / executive / baat karao → action: ESCALATE_HUMAN

SECURITY (HARD RULES):
- NEVER ask for OTP, UPI PIN, CVV, card number, or passwords.
- NEVER say payment is done until gateway confirms.
- Return ONLY valid JSON matching the schema.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
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
