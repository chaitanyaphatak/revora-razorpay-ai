import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { BrowserSpeechController, isSpeechRecognitionSupported, type VoiceState } from "@/lib/speechService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/recoverai/StatusPill";
import {
  AlertCircle,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Headphones,
  LoaderCircle,
  Lock,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { playCustomerNotificationSound } from "@/lib/soundEffects";
import { triggerPaymentSuccessConfetti } from "@/lib/confetti";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export type PaymentState =
  | "IDLE"
  | "INITIALIZING_PAYMENT"
  | "RAZORPAY_CHECKOUT_OPEN"
  | "PAYMENT_PROCESSING"
  | "PAYMENT_VERIFICATION"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED";

function loadRazorpaySdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CustomerVoiceRecovery() {
  const [, params] = useRoute("/recover/:sessionId");
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId ?? "";

  const { data: sessionData, isLoading, refetch } = trpc.recovery.voice.getSession.useQuery(
    { sessionId },
    { enabled: Boolean(sessionId), refetchInterval: false },
  );

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [paymentState, setPaymentState] = useState<PaymentState>("IDLE");
  const [useTextMode, setUseTextMode] = useState(!isSpeechRecognitionSupported());
  const [textInput, setTextInput] = useState("");
  const [interimSpeech, setInterimSpeech] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ paymentId: string; amount: number } | null>(null);

  const speechControllerRef = useRef<BrowserSpeechController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Keep a live ref to sessionData so async handlers always have fresh data
  const sessionDataRef = useRef(sessionData);

  // Keep sessionDataRef in sync with latest sessionData
  useEffect(() => {
    sessionDataRef.current = sessionData;
  }, [sessionData]);

  // Preload Razorpay Checkout SDK
  useEffect(() => {
    void loadRazorpaySdk();
  }, []);

  const createPaymentOrderMutation = trpc.recovery.voice.createPaymentOrder.useMutation();

  const verifyPaymentMutation = trpc.recovery.voice.verifyPayment.useMutation({
    onSuccess: (data) => {
      setPaymentState("PAYMENT_SUCCESS");
      const paymentRef = data.session.paymentReference ?? `pay_test_${Date.now()}`;
      setPaymentSuccessData({
        paymentId: paymentRef,
        amount: data.session.recoveredAmount,
      });
      setVoiceState("completed");
      // Play customer celebration sound on phone
      playCustomerNotificationSound();
      // Trigger golden & emerald confetti celebration burst
      triggerPaymentSuccessConfetti();
      toast.success("Payment verified & completed via Razorpay!", {
        description: `Payment ID: ${paymentRef}`,
      });
      void refetch();

      // Real-time broadcast to Merchant dashboard (zero-refresh sync)
      const recoveryEvent = {
        type: "PAYMENT_RECOVERED",
        paymentId: data.session.paymentId,
        paymentReference: paymentRef,
        amount: data.session.recoveredAmount,
        customerName: data.session.customerName,
        timestamp: new Date().toISOString(),
      };

      try {
        const channel = new BroadcastChannel("revora_voice_channel");
        channel.postMessage(recoveryEvent);
        channel.close();
      } catch (e) {
        // fallback
      }

      window.dispatchEvent(new CustomEvent("revora:voice-payment-recovered", { detail: recoveryEvent }));
      localStorage.setItem("revora_voice_recovered", JSON.stringify(recoveryEvent));
    },
    onError: (err) => {
      setPaymentState("PAYMENT_FAILED");
      setVoiceState("idle");
      toast.error("Payment verification failed", { description: err.message });
    },
  });

  const sendTurnMutation = trpc.recovery.voice.sendTurn.useMutation({
    onSuccess: async (data) => {
      setInterimSpeech("");
      const reply = data.turnResult.replyText;
      const turnAction = (data.turnResult as any).action as string | undefined;
      const isGatewayAction = turnAction === "OPEN_PAYMENT_GATEWAY" || (data.turnResult as any).openGateway === true;

      // Log for debugging
      console.log("[Voice] turnAction:", turnAction, "isGatewayAction:", isGatewayAction, "openGateway:", (data.turnResult as any).openGateway);

      // Toast notifications
      if (turnAction === "COLLECT_PROMISE_DATE") {
        toast.info("Promise-to-Pay recorded", { description: "Automated reminders are paused until your chosen date." });
      } else if (turnAction === "STOP_RECOVERY") {
        toast.info("Recovery stopped", { description: "You will not receive any further automated reminders." });
      }

      // CRITICAL: If gateway action — open Razorpay IMMEDIATELY, don't wait for TTS
      if (isGatewayAction) {
        setVoiceState("payment_ready");
        // Speak confirmation in background (don't await — let Razorpay open at same time)
        if (!isMuted && !useTextMode && speechControllerRef.current) {
          speechControllerRef.current.speak(reply);
        }
        // Open Razorpay right away — this is the key fix
        void handleOpenRazorpayCheckoutFromRef();
        return; // early return — nothing else to do
      }

      // For non-gateway actions: speak reply, then decide next state
      if (!isMuted && !useTextMode && speechControllerRef.current) {
        setVoiceState("speaking");
        await speechControllerRef.current.speak(
          reply,
          () => setVoiceState("speaking"),
          () => {
            // After TTS finishes
            if (turnAction === "STOP_RECOVERY" || turnAction === "ESCALATE_HUMAN") {
              setVoiceState("completed");
            } else if (turnAction === "OFFER_PAYMENT") {
              setVoiceState("payment_ready");
              // Auto restart mic so customer can immediately respond
              setTimeout(() => {
                setVoiceState("listening");
                speechControllerRef.current?.startListening();
              }, 400);
            } else {
              setVoiceState("idle");
              // Auto restart mic after every regular reply
              setTimeout(() => {
                setVoiceState("listening");
                speechControllerRef.current?.startListening();
              }, 400);
            }
          },
        );
      } else {
        // Text mode or muted — set state immediately
        if (turnAction === "STOP_RECOVERY" || turnAction === "ESCALATE_HUMAN") {
          setVoiceState("completed");
        } else if (turnAction === "OFFER_PAYMENT") {
          setVoiceState("payment_ready");
        } else {
          setVoiceState("idle");
        }
      }
    },
    onError: (err) => {
      setVoiceState("idle");
      toast.error("Assistant connection error", { description: err.message });
    },
  });

  // Auto-scroll transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionData?.transcript, interimSpeech, voiceState]);

  // Initialize Speech Controller
  useEffect(() => {
    speechControllerRef.current = new BrowserSpeechController(
      (transcript, isFinal) => {
        if (isFinal) {
          setInterimSpeech("");
          setVoiceState("processing");
          speechControllerRef.current?.stopListening();
          sendTurnMutation.mutate({
            sessionId,
            userInput: transcript,
          });
        } else {
          setInterimSpeech(transcript);
        }
      },
      (errorMsg) => {
        toast.info(errorMsg);
        setUseTextMode(true);
        setVoiceState("idle");
      },
      (state) => {
        if (state === "listening") setVoiceState("listening");
      },
    );

    return () => {
      speechControllerRef.current?.stopListening();
      speechControllerRef.current?.stopSpeaking();
    };
  }, [sessionId]);

  const handleStartListening = () => {
    if (voiceState === "listening") {
      speechControllerRef.current?.stopListening();
      setVoiceState("idle");
      return;
    }

    setVoiceState("listening");
    const started = speechControllerRef.current?.startListening();
    if (!started) {
      setUseTextMode(true);
      setVoiceState("idle");
    }
  };

  const handleSendTextMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim() || sendTurnMutation.isPending) return;

    const message = textInput.trim();
    setTextInput("");
    setVoiceState("processing");

    sendTurnMutation.mutate({
      sessionId,
      userInput: message,
    });
  };

  /**
   * Opens the Official Razorpay Standard Checkout in Test Mode.
   * Uses sessionDataRef (not sessionData) to avoid stale React closure in async callbacks.
   */
  const handleOpenRazorpayCheckoutFromRef = async () => {
    const sd = sessionDataRef.current;
    if (!sd) return;
    return openRazorpayWith(sd);
  };

  const handleOpenRazorpayCheckout = async () => {
    const sd = sessionDataRef.current ?? sessionData;
    if (!sd) return;
    return openRazorpayWith(sd);
  };

  const openRazorpayWith = async (sd: NonNullable<typeof sessionData>) => {

    try {
      // Stop any ongoing TTS before opening Razorpay to avoid conflicts
      speechControllerRef.current?.stopSpeaking();
      setPaymentState("INITIALIZING_PAYMENT");
      setVoiceState("processing");

      const isSdkLoaded = await loadRazorpaySdk();
      if (!isSdkLoaded || !(window as any).Razorpay) {
        throw new Error("Razorpay Checkout SDK failed to load. Please check your internet connection.");
      }

      // Step 2: Backend creates a real Razorpay Test Mode order
      const orderRes = await createPaymentOrderMutation.mutateAsync({ sessionId });
      const order = orderRes.order;

      // Step 3: Open official Razorpay Checkout modal
      setPaymentState("RAZORPAY_CHECKOUT_OPEN");

      const options = {
        key: order.keyId,
        amount: order.amount, // in paise
        currency: order.currency,
        name: sd.merchantName,
        description: "Recovery Payment (" + sd.paymentId + ")",
        order_id: order.orderId,
        prefill: {
          name: sd.customerName,
          email: sd.customerEmail,
        },
        theme: {
          color: "#0f766e",
        },
        modal: {
          ondismiss: () => {
            setPaymentState("PAYMENT_CANCELLED");
            setVoiceState("idle");
            toast.info("Payment cancelled. You can retry whenever you're ready.");
          },
        },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // Step 5: Send response to backend for secure HMAC SHA256 verification
          setPaymentState("PAYMENT_VERIFICATION");
          setVoiceState("processing");
          verifyPaymentMutation.mutate({
            sessionId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            paymentMethod: "razorpay_standard_checkout",
          });
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        setPaymentState("PAYMENT_FAILED");
        setVoiceState("idle");
        toast.error("Payment failed", {
          description: response.error?.description || "Payment was declined by gateway. You can retry.",
        });
      });

      rzp.open();
    } catch (error: any) {
      setPaymentState("PAYMENT_FAILED");
      setVoiceState("idle");
      toast.error("Payment initialization error", {
        description: error.message || "Failed to initialize Razorpay checkout.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Connecting to secure recovery session…</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Recovery Session Unavailable</h1>
          <p className="text-sm text-slate-500">This recovery session link has expired or was already resolved.</p>
          <Button onClick={() => setLocation("/")} className="mt-4 rounded-xl bg-slate-900 text-white">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const isRecovered = sessionData.status === "recovered" || Boolean(paymentSuccessData) || paymentState === "PAYMENT_SUCCESS";
  const isStopped = sessionData.status === "declined" || sessionData.status === "promised_to_pay";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f1f5f9] via-[#f8fafc] to-white text-slate-900 flex flex-col font-sans">
      {/* Top Demo Notification Banner */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs text-center border-b border-slate-800 flex items-center justify-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
        <span>
          <strong>ReVora Recovery Session:</strong> Hinglish Voice AI + Official Razorpay Test Mode Gateway.
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header Branding Card */}
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              {sessionData.merchantName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">{sessionData.merchantName}</h1>
                <span className="rounded-full bg-teal-50 border border-teal-200/60 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  Verified Merchant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <strong>{sessionData.customerName}</strong> · Ref: <span className="font-mono">{sessionData.paymentId}</span>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount Due</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-950">
              {currency.format(sessionData.amount)}
            </p>
          </div>
        </header>

        {/* Recovery Conversation Experience */}
        <main className="flex-1 rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col">
          {/* Assistant Bar */}
          <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Bot className="h-5 w-5" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  ReVora Sahayak
                  <span className="text-[10px] font-normal text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-800">
                    Hinglish · मराठी · English AI
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  {paymentState === "INITIALIZING_PAYMENT"
                    ? "Creating Razorpay Test Order..."
                    : paymentState === "RAZORPAY_CHECKOUT_OPEN"
                      ? "Razorpay Checkout open..."
                      : paymentState === "PAYMENT_VERIFICATION"
                        ? "Verifying Razorpay signature..."
                        : voiceState === "listening"
                          ? "Listening in Hinglish / मराठी / English..."
                          : voiceState === "processing"
                            ? "Processing with Gemini AI..."
                            : voiceState === "speaking"
                              ? "Assistant speaking..."
                              : voiceState === "payment_ready"
                                ? "Payment ready"
                                : isRecovered
                                  ? "Payment verified & recovered"
                                  : "Ready to assist you"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsMuted((m) => !m);
                  if (!isMuted) speechControllerRef.current?.stopSpeaking();
                }}
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseTextMode((t) => !t)}
                className="text-xs text-teal-300 hover:text-teal-200 hover:bg-slate-800 rounded-lg"
              >
                {useTextMode ? "Switch to Voice" : "Use Text"}
              </Button>
            </div>
          </div>

          {/* Transcript / Conversation Area */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto max-h-[380px] space-y-4 bg-slate-50/50">
            {sessionData.transcript.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 text-xs font-bold mt-1">
                    AI
                  </span>
                )}

                {msg.role === "system" ? (
                  <div className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] text-slate-600 border border-slate-300/50">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[82%] text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-br-none shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.intent && (
                      <span className="block text-[9px] mt-1 font-semibold uppercase tracking-wider text-teal-600">
                        Intent: {msg.intent.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Interim Speech Output */}
            {interimSpeech && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-none bg-slate-800/70 text-slate-200 px-4 py-2 text-sm italic animate-pulse">
                  {interimSpeech}…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Recovery Outcome States */}
          {isRecovered ? (
            <div className="p-6 bg-emerald-50 border-t border-emerald-200 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-emerald-950">Payment Recovered & Verified</h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Thank you! Your payment of <strong>{currency.format(sessionData.amount)}</strong> to{" "}
                <strong>{sessionData.merchantName}</strong> has been securely completed via Razorpay.
              </p>
              {paymentSuccessData && (
                <div className="inline-block rounded-xl bg-white border border-emerald-200 px-4 py-2 text-xs font-mono text-emerald-900 shadow-sm">
                  Razorpay Payment ID: <strong>{paymentSuccessData.paymentId}</strong>
                </div>
              )}
            </div>
          ) : isStopped ? (
            <div className="p-6 bg-slate-100 border-t border-slate-200 text-center space-y-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 mb-1">
                <CalendarClock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recovery Status Updated</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {sessionData.status === "promised_to_pay"
                  ? `Automated follow-ups paused until promise date (${sessionData.promiseToPayDate || "scheduled date"}).`
                  : "Recovery process closed per customer request. No further reminders will be sent."}
              </p>
            </div>
          ) : (
            /* Active Voice / Text Controls */
            <div className="p-4 sm:p-6 bg-white border-t border-slate-100 space-y-4">
              {!useTextMode ? (
                /* Voice Mode Interaction */
                <div className="flex flex-col items-center justify-center py-2 space-y-4">
                  {/* Waveform visualizer */}
                  <div className="flex items-center justify-center gap-1.5 h-8">
                    {voiceState === "listening" || voiceState === "speaking" ? (
                      <>
                        <span className="w-1 bg-teal-500 rounded-full h-3 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 bg-teal-600 rounded-full h-7 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 bg-emerald-500 rounded-full h-5 animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="w-1.5 bg-teal-500 rounded-full h-8 animate-bounce" style={{ animationDelay: "100ms" }} />
                        <span className="w-1 bg-teal-600 rounded-full h-4 animate-bounce" style={{ animationDelay: "250ms" }} />
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Click microphone to speak in Hinglish</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleStartListening}
                      disabled={sendTurnMutation.isPending || voiceState === "processing" || createPaymentOrderMutation.isPending || verifyPaymentMutation.isPending}
                      className={`h-16 w-16 rounded-full shadow-xl transition-all transform active:scale-95 flex items-center justify-center ${
                        voiceState === "listening"
                          ? "bg-rose-500 hover:bg-rose-600 text-white ring-8 ring-rose-100 animate-pulse"
                          : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white ring-8 ring-teal-50"
                      }`}
                    >
                      {voiceState === "listening" ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                    </Button>
                  </div>

                  <p className="text-[11px] text-slate-500 text-center">
                    {voiceState === "listening"
                      ? "Listening... Speak naturally (e.g. 'Payment retry karna hai, Razorpay checkout open karo')"
                      : "Tap mic and speak, or use text mode below"}
                  </p>
                </div>
              ) : (
                /* Text Mode Fallback Input */
                <form onSubmit={handleSendTextMessage} className="flex gap-2">
                  <Input
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type in Hinglish, मराठी, or English (e.g. Payment link do, पेमेंट करायचं आहे)..."
                    disabled={sendTurnMutation.isPending || createPaymentOrderMutation.isPending || verifyPaymentMutation.isPending}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-teal-500"
                  />
                  <Button
                    type="submit"
                    disabled={!textInput.trim() || sendTurnMutation.isPending}
                    className="h-11 px-5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                  >
                    {sendTurnMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              )}

              {/* Official Razorpay Checkout CTA Trigger */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-teal-950">Official Razorpay Standard Checkout (Test Mode)</p>
                    <p className="text-[11px] text-teal-800">
                      Pay {currency.format(sessionData.amount)} securely via UPI, Cards, or Netbanking
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleOpenRazorpayCheckout}
                  disabled={createPaymentOrderMutation.isPending || verifyPaymentMutation.isPending}
                  className="h-10 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md flex items-center gap-2 shrink-0"
                >
                  {createPaymentOrderMutation.isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Creating Order…
                    </>
                  ) : verifyPaymentMutation.isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Verifying Signature…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                      Pay {currency.format(sessionData.amount)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Security & Anti-Fraud Notice */}
        <footer className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 shadow-sm">
          <Lock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          <span>
            <strong>Official Razorpay Gateway:</strong> Bank-grade 256-bit encryption. Never share OTP or PIN.
          </span>
        </footer>
      </div>
    </div>
  );
}
