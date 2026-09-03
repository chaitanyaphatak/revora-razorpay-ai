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
    bank_server_down: "jis waqt aapne pay kiya tab bank ka core server kuch seconds ke liye down tha — yeh ek technical glitch tha, koi fault aapka nahi tha",
    insufficient_funds: "payment ke waqt account mein balance thoda kam tha jis ki wajah se transaction decline hua",
    network_drop: "OTP verify hone se pehle hi mobile data disconnect ho gaya tha jis se payment session expire ho gayi",
    daily_limit_exceeded: "aapki aaj ki UPI daily limit puri ho chuki thi, isliye transaction nahi hua — Card ya Netbanking se koi limit nahi hai",
    upi_pin_retry_limit: "UPI PIN galat enter hone ki wajah se aapka account temporarily lock ho gaya tha — ab fresh payment link par koi problem nahi aayegi",
    card_security_block: "bank ne security ke liye payment temporarily block kar di thi — yeh aapki protection ke liye tha",
    gateway_timeout: "payment gateway ne checkout process ke beech ek network timeout detect kiya — server-side issue tha, aapki koi galti nahi",
    card_expired: "aapka card expire ho gaya hai — aap naye card ya UPI se easily pay kar sakte hain",
    session_expired: "session idle raha jis ki wajah se payment complete nahi hui",
    otp_timed_out: "OTP delivery mein delay hua aur OTP expire ho gaya tha",
  };

  const failureExp = failureExplanations[session.failureReason] ??
    `payment ek technical issue ki wajah se fail hui thi — aapka koi paisa account se nahi cut hua`;

  // Marathi failure explanations
  const marathiFailureExplanations: Record<string, string> = {
    upi_timeout: "तुमचा UPI व्यवहार बँक सर्व्हर टाइमआउटमुळे पूर्ण झाला नाही — खात्यातून कोणतेही पैसे कट झाले नाहीत",
    bank_server_down: "बँकेचा सर्व्हर तांत्रिक समस्येमुळे काही क्षणांसाठी डाऊन होता — यात तुमची कोणतीही चूक नाही",
    insufficient_funds: "पेमेंटच्या वेळी खात्यात शिल्लक रक्कम कमी असल्यामुळे व्यवहार पूर्ण झाला नाही",
    network_drop: "OTP पडताळणीपूर्वी नेटवर्क डिस्कनेक्ट झाल्यामुळे पेमेंट सत्र संपले",
    daily_limit_exceeded: "आजची UPI मर्यादा संपली होती — तुम्ही कार्ड किंवा नेटबँकिंगने सहज भरू शकता",
    upi_pin_retry_limit: "चुकीचा UPI PIN टाकल्यामुळे तात्पुरता ब्लॉक झाला होता — आता नवीन लिंकवर अडचण येणार नाही",
    card_security_block: "बँकेने सुरक्षेसाठी पेमेंट तात्पुरते ब्लॉक केले होते — हे तुमच्या संरक्षणासाठी होते",
    gateway_timeout: "पेमेंट गेटवेने चेकआउट दरम्यान नेटवर्क टाइमआउट आढळला — हे सर्व्हर-साइड समस्या होती",
    card_expired: "तुमचे कार्ड एक्सपायर झाले आहे — तुम्ही नवीन कार्ड किंवा UPI ने सहज पे करू शकता",
    session_expired: "सत्र निष्क्रिय राहिल्यामुळे पेमेंट पूर्ण झाले नाही",
    otp_timed_out: "OTP वितरणात विलंब झाला आणि OTP एक्सपायर झाला",
  };

  // Check last conversation state
  const lastTurns = session.transcript.filter((t) => t.role !== "system");
  const lastAssistantTurn = [...lastTurns].reverse().find((t) => t.role === "assistant");
  const hadOfferedPayment = Boolean(
    lastAssistantTurn && (
      lastAssistantTurn.intent === "ASK_FAILURE_REASON" ||
      lastAssistantTurn.intent === "OFFER_PAYMENT" ||
      lastAssistantTurn.intent === "PAYMENT_METHOD_PROBLEM" ||
      lastAssistantTurn.text.toLowerCase().includes("open") ||
      lastAssistantTurn.text.toLowerCase().includes("karen") ||
      lastAssistantTurn.text.toLowerCase().includes("karun") ||
      lastAssistantTurn.text.toLowerCase().includes("link") ||
      lastAssistantTurn.text.toLowerCase().includes("retry")
    )
  );

  const rawInput = userInput.trim();
  const input = rawInput.toLowerCase();

  const isMarathiInput =
    rawInput.includes("झाला") || rawInput.includes("झाली") || rawInput.includes("झालं") ||
    rawInput.includes("करायचं") || rawInput.includes("सांगा") || rawInput.includes("नको") ||
    rawInput.includes("नाही") || rawInput.includes("आहे") || rawInput.includes("काय झालं") ||
    rawInput.includes("कशामुळे") || rawInput.includes("पैसे कटले") || rawInput.includes("उघडा") ||
    rawInput.includes("लिंक द्या") || rawInput.includes("पेमेंट करायचं") ||
    input.includes("kashamule") || input.includes("karaycha") || input.includes("zhala") ||
    input.includes("nako") || input.includes("naahi") || input.includes("aahe");

  // Pure English detection (no Devanagari, no Hinglish keywords)
  const hinglishMarkers = ["kyu", "kyun", "kya", "hai", "nahi", "mera", "aapka", "karo", "karna", "karte", "hoon", "tha", "hua", "gaya", "bilkul", "theek", "thik", "achha", "ji", "bhai", "yaar", "bata", "link", "de do", "kab", "ab", "abhi", "kal", "baad", "dobara", "phir"];
  const hasDevanagari = /[\u0900-\u097F]/.test(rawInput);
  const hasHinglish = hinglishMarkers.some((w) => input.includes(w));
  const isEnglishInput = !hasDevanagari && !hasHinglish && !isMarathiInput && /^[a-zA-Z0-9\s.,?!'"()-]+$/.test(rawInput.trim());

  // FAST PATH 1: Customer asking WHY payment failed (Instant <10ms response)
  const isAskingFailureReason =
    input.includes("kyun") || input.includes("kyu") || input.includes("why") ||
    input.includes("failed") || input.includes("fail") || input.includes("kya hua") ||
    input.includes("reason") || input.includes("wajah") || input.includes("problem") || input.includes("issue") ||
    input.includes("paise") || input.includes("paisa") ||
    rawInput.includes("क्यों") || rawInput.includes("क्यो") || rawInput.includes("फेल") ||
    rawInput.includes("क्या हुआ") || rawInput.includes("कारण") || rawInput.includes("वजह") || rawInput.includes("दिक्कत") ||
    rawInput.includes("का") || rawInput.includes("कशा मुळे") || rawInput.includes("काय झालं") || rawInput.includes("पैसे कटले");

  if (isAskingFailureReason) {
    if (isMarathiInput) {
      const marathiExp = marathiFailureExplanations[session.failureReason] ?? "पेमेंट तांत्रिक समस्येमुळे पूर्ण झाले नाही — खात्यातून पैसे कट झाले नाहीत";
      return {
        replyText: `${session.customerName} जी, ${marathiExp}. खात्यातून पैसे कट झाले नाहीत. मी सुरक्षित पेमेंट गेटवे आता उघडू का?`,
        intent: "ASK_FAILURE_REASON",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }
    if (isEnglishInput) {
      const englishExp: Record<string, string> = {
        upi_timeout: "your UPI transaction timed out due to a bank server delay — no money was deducted from your account",
        bank_server_down: "the bank server was temporarily down when you paid — this was a technical issue, not your fault",
        insufficient_funds: "your account had insufficient balance at the time of payment",
        network_drop: "your network disconnected before OTP verification could complete",
        daily_limit_exceeded: "your UPI daily limit was reached — you can pay using Card or Netbanking with no limits",
        card_expired: "your card has expired — you can easily pay using a new card or UPI",
        gateway_timeout: "the payment gateway detected a network timeout — this was a server-side issue, not your fault",
      };
      const engExp = englishExp[session.failureReason] ?? "your payment failed due to a technical issue — no amount was deducted";
      return {
        replyText: `${session.customerName}, ${engExp}. Your money is completely safe. Shall I open the secure payment page for you right now?`,
        intent: "ASK_FAILURE_REASON",
        action: "OFFER_PAYMENT",
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }
    return {
      replyText: `${session.customerName} ji, ${failureExp}. Aapka koi paisa account se nahi gaya. Kya main payment screen abhi open karun?`,
      intent: "ASK_FAILURE_REASON",
      action: "OFFER_PAYMENT",
      actionPayload: { suggestedPaymentMethod: "card_or_upi" },
    };
  }

  // FAST PATH 2: Customer confirming or asking to pay (Instant <10ms response)
  const isPaymentAffirmative =
    input === "ha" || input === "haan" || input === "haa" || input === "han" ||
    input === "yes" || input === "theek hai" || input === "thik hai" || input === "ok" ||
    input === "okay" || input === "sure" || input === "karo" || input === "kardo" ||
    input === "kar do" || input === "chalo" || input === "sahi hai" || input === "bhejo" ||
    input === "open" || input === "kholo" || input === "khol do" || input === "open karo" ||
    input === "ho" || input === "hoy" || input === "kara" || input === "karto" ||
    rawInput.includes("हाँ") || rawInput.includes("हां") || rawInput.includes("हा") ||
    rawInput.includes("ठीक है") || rawInput.includes("चलो") || rawInput.includes("ओके") ||
    rawInput.includes("करो") || rawInput.includes("कर दो") || rawInput.includes("भेजो") ||
    rawInput.includes("हो") || rawInput.includes("होय") || rawInput.includes("करा") || rawInput.includes("उघडा");

  const hasPaymentOpenKeywords =
    input.includes("open") || input.includes("kholo") || input.includes("khol") ||
    input.includes("khol do") || input.includes("kardo") || input.includes("kar do") ||
    input.includes("payment page") || input.includes("payment mode") || input.includes("payment screen") ||
    input.includes("payment link") || input.includes("page open") || input.includes("mode open") ||
    input.includes("screen open") || input.includes("link open") || input.includes("checkout") ||
    input.includes("gateway") || input.includes("link bhejo") || input.includes("link do") ||
    input.includes("link send") || input.includes("pay karna") || input.includes("pay karta") ||
    input.includes("pay karunga") || input.includes("abhi pay") || input.includes("wapas try") ||
    input.includes("try karo") || input.includes("try karna") ||
    input.includes("retry") || input.includes("dobara") || input.includes("phir se") ||
    input.includes("razorpay") || input.includes("upi se") || input.includes("card se") ||
    input.includes("pay karaycha") || input.includes("pay karto") || input.includes("ugadha") ||
    rawInput.includes("पेमेंट पेज") || rawInput.includes("पेज ओपन") || rawInput.includes("ओपन करो") ||
    rawInput.includes("खोलो") || rawInput.includes("खोल दो") || rawInput.includes("लिंक भेजो") ||
    rawInput.includes("गेटवे") || rawInput.includes("चेकआउट") || rawInput.includes("ट्राई") ||
    rawInput.includes("दोबारा") || rawInput.includes("पे करना") || rawInput.includes("पे करू") ||
    rawInput.includes("पे करूँगा") || rawInput.includes("रेज़रपे") || rawInput.includes("पेमेंट करायचं") ||
    rawInput.includes("उघडा") || rawInput.includes("लिंक द्या");

  if ((hadOfferedPayment && isPaymentAffirmative) || hasPaymentOpenKeywords) {
    if (isMarathiInput) {
      return {
        replyText: `नक्कीच ${session.customerName} जी! मी तुमच्यासाठी सुरक्षित Razorpay पेमेंट गेटवे उघडत आहे — तुम्ही UPI, Card किंवा Netbanking ने ₹${session.amount.toLocaleString("en-IN")} लगेच पूर्ण करू शकता.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }
    if (isEnglishInput) {
      return {
        replyText: `Absolutely ${session.customerName}! Opening the secure Razorpay payment page for you right now — you can pay ₹${session.amount.toLocaleString("en-IN")} via UPI, Card, or Netbanking safely.`,
        intent: "RETRY_PAYMENT",
        action: "OPEN_PAYMENT_GATEWAY",
        openGateway: true,
        actionPayload: { suggestedPaymentMethod: "card_or_upi" },
      };
    }
    return {
      replyText: `Bilkul ${session.customerName} ji! Main abhi aapke liye secure payment gateway open kar raha hoon — aap UPI, Card ya Netbanking se ₹${session.amount.toLocaleString("en-IN")} safely complete kar sakte hain.`,
      intent: "RETRY_PAYMENT",
      action: "OPEN_PAYMENT_GATEWAY",
      openGateway: true,
      actionPayload: { suggestedPaymentMethod: "card_or_upi" },
    };
  }

  // FAST PATH 3: Specific payment method query
  if (
    input.includes("upi") || input.includes("server") || input.includes("timeout") || input.includes("paise cut") ||
    rawInput.includes("यूपीआई") || rawInput.includes("सर्वर") || rawInput.includes("पैसे")
  ) {
    return {
      replyText: `Samajh gaya! ${failureExp}. Aap bina kisi dikkat ke Card ya Netbanking se safely complete kar sakte hain — kya main payment screen abhi open karun?`,
      intent: "PAYMENT_METHOD_PROBLEM",
      action: "OFFER_PAYMENT",
      actionPayload: { suggestedPaymentMethod: "card" },
    };
  }

  // FAST PATH 4: Promise to pay later
  if (
    input.includes("kal") || input.includes("baad me") || input.includes("later") ||
    input.includes("salary") || input.includes("date") || input.includes("tarikh") ||
    input.includes("tarik") || input.includes("week") || input.includes("mahine") ||
    rawInput.includes("कल") || rawInput.includes("बाद में") || rawInput.includes("सैलरी") || rawInput.includes("तारीख")
  ) {
    return {
      replyText: `Koi baat nahi ${session.customerName} ji! Humne aapka Promise-to-Pay note kar liya hai. Hum tab tak automated reminders pause kar rahe hain. Dhanyawaad!`,
      intent: "PROMISE_TO_PAY",
      action: "COLLECT_PROMISE_DATE",
      actionPayload: { promiseDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
    };
  }

  // FAST PATH 5: Declining
  if (
    input === "nahi" || input === "no" || input.includes("cancel") || input.includes("stop") ||
    input.includes("don't") || input.includes("mat") || input.includes("nahi karna") ||
    rawInput.includes("नहीं") || rawInput.includes("ना") || rawInput.includes("कैंसिल") || rawInput.includes("मत")
  ) {
    return {
      replyText: `Ji theek hai, aapki request ke mutabiq humne recovery process yahin stop kar diya hai. Aapko aage koi reminder nahi aayega. Dhanyawaad!`,
      intent: "CUSTOMER_DECLINED",
      action: "STOP_RECOVERY",
      actionPayload: { reason: "customer_requested_cancellation" },
    };
  }

  // FAST PATH 6: Human escalation
  if (
    input.includes("human") || input.includes("agent") || input.includes("support") ||
    input.includes("executive") || input.includes("baat karao") || input.includes("insaan") ||
    rawInput.includes("एजेंट") || rawInput.includes("सपोर्ट") || rawInput.includes("इंसान") || rawInput.includes("बात कराओ")
  ) {
    return {
      replyText: `Zaroor! Main aapka case hamari support team ke executive ko escalate kar raha hoon. Wo jald hi aapse contact karenge.`,
      intent: "NEEDS_HUMAN_SUPPORT",
      action: "ESCALATE_HUMAN",
      actionPayload: { reason: "escalation_requested" },
    };
  }

  // Fallback intelligent heuristic in case API key is absent or offline
  const generateFallbackResponse = (): VoiceTurnResponse => {
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
  const detectedInputLang = isMarathiInput ? "Marathi" : isEnglishInput ? "English" : "Hinglish";
  const systemPrompt = `You are "ReVora Sahayak", an empathetic, concise, and highly effective AI Revenue Recovery Assistant for ${session.merchantName}.
You are speaking in real-time with customer ${session.customerName} regarding their failed payment of ₹${session.amount.toLocaleString("en-IN")}.

FAILURE REASON: ${failureExp}. (No money was deducted from customer account).
DETECTED CUSTOMER LANGUAGE THIS TURN: ${detectedInputLang}.

🔴 MOST CRITICAL RULE — LANGUAGE MIRRORING:
You MUST respond in the EXACT SAME LANGUAGE as the customer's current message.
- Customer wrote in English → reply in polite Indian English ONLY.
- Customer wrote in Hindi/Hinglish → reply in warm Hinglish (Roman script) ONLY.
- Customer wrote in Marathi → reply in fluent native Marathi ONLY.
- If the customer switches language mid-conversation, YOU ALSO switch immediately.
- NEVER mix languages unless the customer themselves mixed them.

CONVERSATIONAL RULES:
1. If you already explained why payment failed and customer confirms (yes/ha/ho/karo/sure/open) → immediately set action="OPEN_PAYMENT_GATEWAY", openGateway=true. Do NOT repeat failure reason.
2. Customer wants to pay → action="OPEN_PAYMENT_GATEWAY", openGateway=true.
3. Customer asks why → explain concisely in their language → action="OFFER_PAYMENT".
4. Customer wants to pay later → action="COLLECT_PROMISE_DATE", intent="PROMISE_TO_PAY".
5. Customer says no → action="STOP_RECOVERY", intent="CUSTOMER_DECLINED".
6. Customer asks for human → action="ESCALATE_HUMAN".

STYLE:
- Maximum 2 sentences. Warm. Empathetic. Natural.
- NEVER ask for OTP, PIN, password, or CVV.
- Return ONLY valid JSON matching the schema.`;

  // Format valid alternating Gemini message contents
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

  // Ensure first turn in contents is always "user" (Gemini requirement)
  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Namaste, main " + session.customerName + " hoon." }],
    });
  }

  // Append the single current user turn
  if (contents[contents.length - 1].role === "user") {
    contents[contents.length - 1] = {
      role: "user",
      parts: [{ text: userInput }],
    };
  } else {
    contents.push({
      role: "user",
      parts: [{ text: userInput }],
    });
  }

  try {
    // Ultra-fast Gemini 2.0 Flash endpoint with 2.2s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

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
            maxOutputTokens: 250,
            responseMimeType: "application/json",
            responseJsonSchema: geminiVoiceSchema,
          },
        }),
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("[GeminiVoice] API responded with " + response.status + ". Using fallback response.");
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

    const isPayIntent =
      parsed.action === "OPEN_PAYMENT_GATEWAY" ||
      lowerReply.includes("payment page open") ||
      lowerReply.includes("gateway open") ||
      lowerReply.includes("khol raha hoon");

    if (isPayIntent) {
      parsed.action = "OPEN_PAYMENT_GATEWAY";
      parsed.openGateway = true;
    }
    return parsed;
  } catch (error) {
    console.warn("[GeminiVoice] Gemini request timed out or errored. Using instant fallback.");
    return generateFallbackResponse();
  }
}

