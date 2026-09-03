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
  | "OPEN_PAYMENT_GATEWAY"
  | "COLLECT_PROMISE_DATE"
  | "STOP_RECOVERY"
  | "ESCALATE_HUMAN"
  | "EXPLAIN_CONTEXT"
  | "CONTINUE_CONVERSATION";

export type VoiceTurnResponse = {
  replyText: string;
  intent: VoiceTurnIntent;
  action: VoiceTurnAction;
  openGateway?: boolean;
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
      description: "Polite, empathetic, natural Hinglish reply (1-2 sentences) suitable for speech output.",
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
      description: "System recovery action.",
    },
    openGateway: {
      type: "BOOLEAN",
      description: "Set true ONLY when action is OPEN_PAYMENT_GATEWAY.",
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
    upi_timeout: "aapka UPI transaction bank server ki taraf se timeout ho gaya tha — network lag ke wajah se payment complete nahi hui, paise cut nahi hue",
    bank_server_down: "jis waqt aapne pay kiya tab bank ka server temporary down tha — yeh technical glitch tha, paise safe hain",
    insufficient_funds: "payment ke waqt account mein balance thoda kam tha jis ki wajah se transaction decline hua",
    network_drop: "OTP verify hone se pehle hi mobile connection disconnect ho gaya tha",
    daily_limit_exceeded: "aaj ki UPI daily limit reach ho gayi thi — aap Card ya Netbanking se easily pay kar sakte hain",
    upi_pin_retry_limit: "UPI PIN retry limit ki wajah se temporary pause hua tha — ab fresh link par smoothly chalega",
    card_security_block: "bank ne security ke liye payment temporarily hold ki thi",
    gateway_timeout: "payment gateway server par momentary delay tha",
    card_expired: "card expire ho gaya hai — aap UPI ya doosre card se pay kar sakte hain",
  };

  const failureExp = failureExplanations[session.failureReason] ??
    `payment technical issue ki wajah se complete nahi hui — aapka koi paisa account se nahi kata`;

  // Check last conversation state
  const lastTurns = session.transcript.filter((t) => t.role !== "system");
  const lastAssistantTurn = [...lastTurns].reverse().find((t) => t.role === "assistant");
  const hadOfferedPayment = Boolean(
    lastAssistantTurn && (
      lastAssistantTurn.intent === "ASK_FAILURE_REASON" ||
      lastAssistantTurn.intent === "OFFER_PAYMENT" ||
      lastAssistantTurn.intent === "PAYMENT_METHOD_PROBLEM" ||
      lastAssistantTurn.text.toLowerCase().includes("open") ||
      lastAssistantTurn.text.toLowerCase().includes("khol") ||
      lastAssistantTurn.text.toLowerCase().includes("pay") ||
      lastAssistantTurn.text.toLowerCase().includes("link") ||
      lastAssistantTurn.text.toLowerCase().includes("retry")
    )
  );

  const rawInput = userInput.trim();
  const input = rawInput.toLowerCase();

  // FAST PATH 1: Customer wants to pay / confirms payment / asks for link (Zero delay <10ms)
  const isPaymentAffirmative =
    input === "ha" || input === "haan" || input === "haa" || input === "han" ||
    input === "yes" || input === "theek hai" || input === "thik hai" || input === "ok" ||
    input === "okay" || input === "sure" || input === "karo" || input === "kardo" ||
    input === "kar do" || input === "chalo" || input === "bhejo" || input === "open" ||
    input === "kholo" || input === "khol do" || input === "open karo" ||
    rawInput.includes("हाँ") || rawInput.includes("हां") || rawInput.includes("हा") ||
    rawInput.includes("ठीक है") || rawInput.includes("चलो") || rawInput.includes("ओके") ||
    rawInput.includes("करो") || rawInput.includes("कर दो") || rawInput.includes("भेजो");

  const hasPaymentOpenKeywords =
    input.includes("open") || input.includes("kholo") || input.includes("khol") ||
    input.includes("khol do") || input.includes("kardo") || input.includes("kar do") ||
    input.includes("payment page") || input.includes("payment screen") || input.includes("payment link") ||
    input.includes("page open") || input.includes("screen open") || input.includes("link open") ||
    input.includes("checkout") || input.includes("gateway") || input.includes("link bhejo") ||
    input.includes("link do") || input.includes("pay karna") || input.includes("pay karta") ||
    input.includes("pay karunga") || input.includes("abhi pay") || input.includes("retry") ||
    input.includes("dobara") || input.includes("phir se") || input.includes("razorpay") ||
    input.includes("upi se") || input.includes("card se") || input.includes("pay now") ||
    rawInput.includes("पेमेंट पेज") || rawInput.includes("ओपन करो") || rawInput.includes("खोलो") ||
    rawInput.includes("लिंक भेजो") || rawInput.includes("पे करना") || rawInput.includes("पे करूँगा");

  if ((hadOfferedPayment && isPaymentAffirmative) || hasPaymentOpenKeywords) {
    return {
      replyText: `Bilkul ${session.customerName} ji! Main abhi aapke liye secure Razorpay checkout open kar raha hoon — aap UPI, Card ya Netbanking se ₹${session.amount.toLocaleString("en-IN")} safely complete kar sakte hain.`,
      intent: "RETRY_PAYMENT",
      action: "OPEN_PAYMENT_GATEWAY",
      openGateway: true,
      actionPayload: { suggestedPaymentMethod: "card_or_upi" },
    };
  }

  // FAST PATH 2: Customer asking WHY payment failed
  const isAskingFailureReason =
    input.includes("kyun") || input.includes("kyu") || input.includes("why") ||
    input.includes("failed") || input.includes("fail") || input.includes("kya hua") ||
    input.includes("reason") || input.includes("wajah") || input.includes("problem") ||
    input.includes("issue") || input.includes("paise") || input.includes("paisa") ||
    rawInput.includes("क्यों") || rawInput.includes("क्यो") || rawInput.includes("फेल") ||
    rawInput.includes("क्या हुआ") || rawInput.includes("कारण") || rawInput.includes("वजह");

  if (isAskingFailureReason) {
    return {
      replyText: `${session.customerName} ji, ${failureExp}. Aapka koi paisa account se nahi kata. Kya main payment screen abhi open karun?`,
      intent: "ASK_FAILURE_REASON",
      action: "OFFER_PAYMENT",
      actionPayload: { suggestedPaymentMethod: "card_or_upi" },
    };
  }

  // FAST PATH 3: Asking about discount / price offer
  if (
    input.includes("discount") || input.includes("offer") || input.includes("coupon") ||
    input.includes("kam") || input.includes("kam karo") || input.includes("mehenga") ||
    input.includes("price") || input.includes("rate")
  ) {
    return {
      replyText: `${session.customerName} ji, yeh ${session.merchantName} ka direct best price ₹${session.amount.toLocaleString("en-IN")} hai. Kya main payment gateway open karun?`,
      intent: "GENERAL_QUERY",
      action: "OFFER_PAYMENT",
      actionPayload: { suggestedPaymentMethod: "card_or_upi" },
    };
  }

  // FAST PATH 4: Promise to pay later
  if (
    input.includes("kal") || input.includes("baad me") || input.includes("later") ||
    input.includes("salary") || input.includes("date") || input.includes("tarikh") ||
    input.includes("tarik") || input.includes("week") || input.includes("parso") ||
    rawInput.includes("कल") || rawInput.includes("बाद में") || rawInput.includes("सैलरी")
  ) {
    return {
      replyText: `Koi baat nahi ${session.customerName} ji! Humne aapka Promise-to-Pay note kar liya hai, tab tak automated reminders pause rahenge. Dhanyawaad!`,
      intent: "PROMISE_TO_PAY",
      action: "COLLECT_PROMISE_DATE",
      actionPayload: { promiseDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
    };
  }

  // FAST PATH 5: Customer declining
  if (
    input === "nahi" || input === "no" || input.includes("cancel") || input.includes("stop") ||
    input.includes("don't") || input.includes("mat karo") || input.includes("nahi karna") ||
    input.includes("nahi chahiye") || rawInput.includes("नहीं") || rawInput.includes("ना")
  ) {
    return {
      replyText: `Ji theek hai, aapke kehne par recovery process yahin stop kar di gayi hai. Aapko aage koi reminder nahi aayega. Dhanyawaad!`,
      intent: "CUSTOMER_DECLINED",
      action: "STOP_RECOVERY",
      actionPayload: { reason: "customer_declined" },
    };
  }

  // FAST PATH 6: Human escalation
  if (
    input.includes("human") || input.includes("agent") || input.includes("support") ||
    input.includes("executive") || input.includes("baat karao") || input.includes("insaan") ||
    rawInput.includes("एजेंट") || rawInput.includes("सपोर्ट") || rawInput.includes("बात कराओ")
  ) {
    return {
      replyText: `Zaroor! Main aapka case support team ke executive ko transfer kar raha hoon. Wo jald hi aapse contact karenge.`,
      intent: "NEEDS_HUMAN_SUPPORT",
      action: "ESCALATE_HUMAN",
      actionPayload: { reason: "escalation_requested" },
    };
  }

  // Smart Contextual Hinglish Fallback (Ensures the assistant NEVER gets stuck repeating general query)
  const generateFallbackResponse = (): VoiceTurnResponse => {
    // If the customer asks anything friendly or inquiring
    if (input.includes("hello") || input.includes("hi") || input.includes("kaun") || input.includes("kya hai")) {
      return {
        replyText: `Namaste ${session.customerName} ji! Main ReVora Sahayak hoon. ${session.merchantName} par aapka ₹${session.amount.toLocaleString("en-IN")} ka payment incomplete tha. Kya main complete karne ke liye checkout open karun?`,
        intent: "GENERAL_QUERY",
        action: "EXPLAIN_CONTEXT",
      };
    }

    // If context implies payment
    if (hadOfferedPayment) {
      return {
        replyText: `Ji ${session.customerName} ji, main abhi payment screen open kar raha hoon — aap ₹${session.amount.toLocaleString("en-IN")} aasani se pay kar sakte hain.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
      };
    }

    // Default polite Hinglish assistance
    return {
      replyText: `${session.customerName} ji, ${session.merchantName} ke ₹${session.amount.toLocaleString("en-IN")} payment ke regarding main aapki help kar sakta hoon. Kya main payment page open karun?`,
      intent: "GENERAL_QUERY",
      action: "OFFER_PAYMENT",
    };
  };

  if (!apiKey || !apiKey.startsWith("AIzaSy")) {
    return generateFallbackResponse();
  }

  // Gemini 2.0 Flash call
  const systemPrompt = `You are "ReVora Sahayak", an empathetic, concise AI Revenue Recovery Assistant for ${session.merchantName}.
You are on a voice call with customer ${session.customerName} regarding their incomplete payment of ₹${session.amount.toLocaleString("en-IN")}.
Failure reason: ${failureExp}.

RULES:
1. Speak exclusively in warm, friendly Hinglish (Hindi words in Roman script).
2. Keep replies short (1-2 sentences maximum) and conversational.
3. If customer wants to pay or agrees -> set action="OPEN_PAYMENT_GATEWAY", openGateway=true.
4. If customer asks why payment failed -> explain politely that money was not deducted and ask if they want to pay now.
5. NEVER ask for OTP, PIN, password, or CVV.`;

  const rawHistory = session.transcript.filter((t) => t.role === "user" || t.role === "assistant");
  const previousTurns = (rawHistory.length > 0 && rawHistory[rawHistory.length - 1].role === "user" && rawHistory[rawHistory.length - 1].text === userInput)
    ? rawHistory.slice(0, -1)
    : rawHistory;

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const turn of previousTurns.slice(-4)) {
    const role = turn.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += " " + turn.text;
    } else {
      contents.push({ role, parts: [{ text: turn.text }] });
    }
  }

  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Namaste, main " + session.customerName + " hoon." }],
    });
  }

  if (contents[contents.length - 1].role === "user") {
    contents[contents.length - 1] = { role: "user", parts: [{ text: userInput }] };
  } else {
    contents.push({ role: "user", parts: [{ text: userInput }] });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
            responseMimeType: "application/json",
            responseJsonSchema: geminiVoiceSchema,
          },
        }),
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return generateFallbackResponse();
    }

    const payload = (await response.json()) as GeminiApiResponse;
    const content =
      payload.candidates?.[0]?.content?.parts
        ?.filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("") ?? "";

    const parsed = JSON.parse(content) as VoiceTurnResponse;
    const lowerReply = (parsed.replyText || "").toLowerCase();

    if (
      parsed.action === "OPEN_PAYMENT_GATEWAY" ||
      lowerReply.includes("payment page open") ||
      lowerReply.includes("gateway open") ||
      lowerReply.includes("khol raha hoon")
    ) {
      parsed.action = "OPEN_PAYMENT_GATEWAY";
      parsed.openGateway = true;
    }
    return parsed;
  } catch {
    return generateFallbackResponse();
  }
}
