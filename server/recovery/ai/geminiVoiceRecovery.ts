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

  // Check last conversation state
  const lastTurns = session.transcript.filter((t) => t.role !== "system");
  const lastAssistantTurn = [...lastTurns].reverse().find((t) => t.role === "assistant");
  const hadOfferedPayment = lastAssistantTurn && (
    lastAssistantTurn.intent === "ASK_FAILURE_REASON" ||
    lastAssistantTurn.intent === "OFFER_PAYMENT" ||
    lastAssistantTurn.intent === "PAYMENT_METHOD_PROBLEM" ||
    lastAssistantTurn.text.toLowerCase().includes("open") ||
    lastAssistantTurn.text.toLowerCase().includes("karen") ||
    lastAssistantTurn.text.toLowerCase().includes("karun") ||
    lastAssistantTurn.text.toLowerCase().includes("link") ||
    lastAssistantTurn.text.toLowerCase().includes("retry")
  );

  // Fallback intelligent heuristic in case API key is absent or offline
  const generateFallbackResponse = (): VoiceTurnResponse => {
    const input = userInput.toLowerCase().trim();

    // 1. Direct or contextual payment opening intent
    const isPaymentAffirmative =
      input === "ha" || input === "haan" || input === "yes" || input === "theek hai" ||
      input === "ok" || input === "okay" || input === "sure" || input === "karo" ||
      input === "kardo" || input === "kar do" || input === "chalo" || input === "sahi hai";

    const hasPaymentOpenKeywords =
      input.includes("open") || input.includes("kholo") || input.includes("khol") ||
      input.includes("khol do") || input.includes("kardo") || input.includes("kar do") ||
      input.includes("payment page") || input.includes("payment mode") || input.includes("payment screen") ||
      input.includes("payment link") || input.includes("page open") || input.includes("mode open") ||
      input.includes("screen open") || input.includes("link open") || input.includes("checkout") ||
      input.includes("gateway") || input.includes("link bhejo") || input.includes("link do") ||
      input.includes("link send") || input.includes("pay karna") || input.includes("pay karta") ||
      input.includes("pay karunga") || input.includes("abhi pay") || input.includes("wapas try") ||
      input.includes("retry") || input.includes("dobara") || input.includes("razorpay");

    if ((hadOfferedPayment && isPaymentAffirmative) || hasPaymentOpenKeywords) {
      return {
        replyText: `Bilkul ${session.customerName} ji! Main abhi aapke liye secure payment gateway open kar raha hoon — aap UPI, Card ya Netbanking se ₹${session.amount.toLocaleString("en-IN")} safely complete kar sakte hain.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    // 2. Customer asking WHY payment failed
    if (
      input.includes("kyun") || input.includes("kyu") || input.includes("why") ||
      input.includes("failed") || input.includes("fail") || input.includes("kya hua") ||
      input.includes("reason") || input.includes("wajah") || input.includes("problem") || input.includes("issue")
    ) {
      return {
        replyText: `${session.customerName} ji, ${failureExp}. Aapka koi paisa account se nahi gaya. Kya main payment page abhi open karun?`,
        intent: "ASK_FAILURE_REASON",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }

    // 3. Specific payment method issue
    if (input.includes("upi") || input.includes("server") || input.includes("timeout") || input.includes("paise cut")) {
      return {
        replyText: `Samajh gaya! ${failureExp}. Aap bina kisi dikkat ke Card ya Netbanking se safely complete kar sakte hain — kya main payment screen abhi open karun?`,
        intent: "PAYMENT_METHOD_PROBLEM",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card" },
      };
    }

    // 4. Promise to pay later
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

    // 5. Customer declining
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

    // 6. Human escalation
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

    // 7. General greeting / query
    return {
      replyText: `Namaste ${session.customerName} ji! Main ReVora Sahayak hoon. ${session.merchantName} ke ₹${session.amount.toLocaleString("en-IN")} ke pending payment ke regarding aapse baat kar raha hoon. Kya main payment page open karke aapki help karun?`,
      intent: "GENERAL_QUERY",
      action: "EXPLAIN_CONTEXT",
    };
  };

  if (!apiKey) {
    return generateFallbackResponse();
  }

  // Build native multi-turn conversation for Gemini 2.0 Flash
  const systemPrompt = `You are "ReVora Sahayak", an empathetic, concise, and highly effective AI Revenue Recovery Assistant for ${session.merchantName}.
You are speaking in real-time with customer ${session.customerName} regarding their failed payment of ₹${session.amount.toLocaleString("en-IN")}.

FAILURE REASON: ${failureExp}. (No money was deducted from customer account).

CRITICAL CONVERSATIONAL RULES:
1. ALWAYS REMEMBER PREVIOUS TURNS:
   - If in the previous turn you already explained why payment failed and asked if they want to pay/open the payment screen, and the customer now says "ha", "open karo", "payment page kholo", "payment mode open karo", "khol do", "theek hai", "link do", or anything affirmative:
     -> DO NOT repeat the failure reason explanation!
     -> Immediately say: "Bilkul! Main abhi payment page open kar raha hoon." and set action="OPEN_PAYMENT_GATEWAY", openGateway=true.
2. WHEN CUSTOMER WANTS TO PAY:
   - Whenever customer says to pay, open payment page, open payment mode, send link, retry, or confirms with "yes/ha/karo":
     -> action="OPEN_PAYMENT_GATEWAY", openGateway=true.
3. WHEN CUSTOMER ASKS WHY PAYMENT FAILED:
   - Explain the reason concisely in Hinglish (1-2 sentences) and politely ask if you should open the payment page for them.
   - action="OFFER_PAYMENT", intent="ASK_FAILURE_REASON".
4. WHEN CUSTOMER ASKS TO PAY LATER (salary, kal, next week):
   - action="COLLECT_PROMISE_DATE", intent="PROMISE_TO_PAY".
5. WHEN CUSTOMER SAYS NO / CANCEL / STOP:
   - action="STOP_RECOVERY", intent="CUSTOMER_DECLINED".
6. WHEN CUSTOMER ASKS FOR HUMAN AGENT:
   - action="ESCALATE_HUMAN", intent="NEEDS_HUMAN_SUPPORT".

STYLE GUIDELINES:
- Speak warm, natural Hinglish (Roman script).
- Maximum 1 to 2 sentences per reply (this is spoken aloud).
- NEVER ask for OTP, PIN, password, or CVV.
- Return ONLY valid JSON matching the schema.`;

  // Format valid alternating Gemini message contents
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  // Filter non-system messages from history (up to last 6)
  const history = session.transcript.filter((t) => t.role === "user" || t.role === "assistant").slice(-6);

  for (const turn of history) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    });
  }

  // Add the current incoming user turn
  contents.push({
    role: "user",
    parts: [{ text: userInput }],
  });

  // Ensure first turn in contents is always "user" (Gemini requirement)
  if (contents.length > 0 && contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: `Namaste, main ${session.customerName} hoon.` }],
    });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.1,
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
    if (parsed.action === "OPEN_PAYMENT_GATEWAY") {
      parsed.openGateway = true;
    }
    return parsed;
  } catch (error) {
    console.warn("[GeminiVoice] Error executing Gemini request:", error);
    return generateFallbackResponse();
  }
}
