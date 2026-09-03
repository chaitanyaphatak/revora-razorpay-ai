/**
 * Zero-cost, in-browser Multilingual Speech Service using standard Web Speech API.
 * - Supports Marathi (मराठी), Hindi/Hinglish (हिन्दी), and Indian English with Neural Voice Selection.
 * - Speech-to-Text (STT): webkitSpeechRecognition / SpeechRecognition
 * - Text-to-Speech (TTS): window.speechSynthesis
 * - No paid third-party voice providers
 */

// Browser SpeechRecognition interface types
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as IWindowWithSpeech;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export type VoiceState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "payment_ready" | "completed" | "failed";

// Voice cache
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/**
 * Detects whether the spoken or synthesized text is Marathi, Hindi/Hinglish, or English.
 */
export function detectLanguage(text: string): "mr" | "hi" | "en" {
  if (!text) return "hi";
  const lower = text.toLowerCase();

  // Marathi specific markers (Devnagari words & phonetic transliterations)
  const marathiMarkers = [
    "झाला", "झाली", "झाले", "करायचं", "करायचे", "सांगा", "पाहिजे", "आता", "नको",
    "नाही", "कसं", "कसे", "का", "बघू", "करा", "लिंक", "रद्द", "थांबा", "उद्या",
    "नंतर", "माझं", "माझा", "माझी", "तुमचा", "तुमचे", "तुमची", "पैसे", "करावे",
    "झालं", "आहे", "होय", "kashamule", "zhala", "karaycha", "nako", "maza", "mazi"
  ];

  if (marathiMarkers.some((m) => text.includes(m) || lower.includes(m))) {
    return "mr";
  }

  // Devanagari Hindi or Hinglish keywords
  const devanagariRegex = /[\u0900-\u097F]/;
  const hindiHinglishKeywords = [
    "karna", "karo", "kyu", "kyun", "hua", "hai", "mujhe", "mera", "meri",
    "paise", "paisa", "aapka", "karenge", "batao", "link", "de", "do", "kripya",
    "namaste", "dhanyawad", "baad", "mein", "ab", "abhi", "karte", "raha", "gaya"
  ];

  if (devanagariRegex.test(text) || hindiHinglishKeywords.some((w) => lower.includes(w))) {
    return "hi";
  }

  return "en";
}

/**
 * Finds the highest quality Neural voice for the specified language:
 * - Marathi: Microsoft Aarohi / Manohar or Google Marathi
 * - Hindi: Microsoft Swara / Madhur or Google Hindi
 * - English: Microsoft Neerja / Prabhat or Google Indian English
 */
export function getBestVoiceForLanguage(lang: "mr" | "hi" | "en"): { voice: SpeechSynthesisVoice | null; langCode: string } {
  const voices = loadVoices();
  if (voices.length === 0) return { voice: null, langCode: lang === "mr" ? "mr-IN" : lang === "en" ? "en-IN" : "hi-IN" };

  if (lang === "mr") {
    // 1. Marathi Neural Voices (Edge / Chrome)
    const aarohi = voices.find(
      (v) => (v.name.includes("Aarohi") || v.name.includes("Manohar")) && v.name.includes("Natural")
    );
    if (aarohi) return { voice: aarohi, langCode: "mr-IN" };

    const googleMarathi = voices.find(
      (v) => v.name.includes("Google") && (v.lang.startsWith("mr") || v.name.includes("मराठी") || v.name.toLowerCase().includes("marathi"))
    );
    if (googleMarathi) return { voice: googleMarathi, langCode: "mr-IN" };

    const anyMarathi = voices.find(
      (v) => v.lang.startsWith("mr") || v.name.toLowerCase().includes("marathi") || v.name.includes("मराठी")
    );
    if (anyMarathi) return { voice: anyMarathi, langCode: "mr-IN" };
  }

  if (lang === "hi" || lang === "mr") {
    // 2. Hindi Neural Voices (Edge / Chrome)
    const swara = voices.find(
      (v) => (v.name.includes("Swara") || v.name.includes("Madhur")) && v.name.includes("Natural")
    );
    if (swara) return { voice: swara, langCode: "hi-IN" };

    const googleHindi = voices.find(
      (v) => v.name.includes("Google") && (v.lang.startsWith("hi") || v.name.includes("हिन्दी") || v.name.includes("Hindi"))
    );
    if (googleHindi) return { voice: googleHindi, langCode: "hi-IN" };

    const anyHindi = voices.find(
      (v) => v.lang.startsWith("hi") || v.name.toLowerCase().includes("hindi")
    );
    if (anyHindi) return { voice: anyHindi, langCode: "hi-IN" };
  }

  // 3. Indian English Neural Voices
  const neerja = voices.find(
    (v) => (v.name.includes("Neerja") || v.name.includes("Prabhat")) && v.name.includes("Natural")
  );
  if (neerja) return { voice: neerja, langCode: "en-IN" };

  const googleIndianEnglish = voices.find(
    (v) => v.name.includes("Google") && (v.lang === "en-IN" || v.name.includes("India"))
  );
  if (googleIndianEnglish) return { voice: googleIndianEnglish, langCode: "en-IN" };

  const anyIndianEnglish = voices.find(
    (v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india")
  );
  if (anyIndianEnglish) return { voice: anyIndianEnglish, langCode: "en-IN" };

  return { voice: voices[0] || null, langCode: "hi-IN" };
}

export function getBestIndianVoice(): SpeechSynthesisVoice | null {
  return getBestVoiceForLanguage("hi").voice;
}

/**
 * Cleans text for speech synthesis so the engine doesn't stutter on emojis or markdown
 */
function cleanTextForSpeech(rawText: string): string {
  return rawText
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/₹\s*([0-9,]+)/g, "$1 rupees")
    .replace(/INR\s*([0-9,]+)/gi, "$1 rupees")
    .replace(/\s+/g, " ")
    .trim();
}

export class BrowserSpeechController {
  private recognition: any = null;
  private isListening = false;
  private preferredLanguage = "hi-IN";
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private latestTranscript = "";
  private hasCommittedFinal = false;
  private silenceTimer: any = null;

  constructor(
    private onTranscript: (transcript: string, isFinal: boolean) => void,
    private onError: (error: string) => void,
    private onStateChange?: (state: "listening" | "idle") => void,
  ) {
    this.initRecognition();
    loadVoices();
  }

  private commitTranscript(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.hasCommittedFinal) return;
    this.hasCommittedFinal = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isListening = false;
    this.onStateChange?.("idle");
    try {
      this.recognition?.stop();
    } catch {}
    this.onTranscript(trimmed, true);
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    // Auto-commit speech after 1.8s pause on mobile
    this.silenceTimer = setTimeout(() => {
      if (this.latestTranscript.trim() && !this.hasCommittedFinal) {
        this.commitTranscript(this.latestTranscript);
      }
    }, 1800);
  }

  private initRecognition() {
    if (typeof window === "undefined") return;
    const win = window as IWindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn("[SpeechService] SpeechRecognition not supported in this browser.");
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3; // More alternatives = better accuracy across languages
      // hi-IN picks up Hindi, Hinglish, and Indian English naturally
      // For Marathi speakers it also partially understands Devnagari
      this.recognition.lang = "hi-IN";

      this.recognition.onstart = () => {
        this.isListening = true;
        this.hasCommittedFinal = false;
        this.latestTranscript = "";
        this.onStateChange?.("listening");
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        const candidateText = (finalTranscript || interim).trim();
        if (candidateText) {
          this.latestTranscript = candidateText;
          this.onTranscript(candidateText, false);
          this.resetSilenceTimer();
        }

        if (finalTranscript.trim()) {
          this.commitTranscript(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        this.isListening = false;
        this.onStateChange?.("idle");
        if (event.error === "no-speech") {
          if (this.latestTranscript.trim() && !this.hasCommittedFinal) {
            this.commitTranscript(this.latestTranscript);
          }
          return;
        }
        if (event.error === "not-allowed") {
          this.onError("Microphone permission was denied. You can continue using text input.");
        } else {
          this.onError(`Voice recognition: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange?.("idle");
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        if (this.latestTranscript.trim() && !this.hasCommittedFinal) {
          this.commitTranscript(this.latestTranscript);
        }
      };
    } catch (err) {
      console.warn("[SpeechService] Failed to initialize SpeechRecognition:", err);
    }
  }

  public startListening(): boolean {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.hasCommittedFinal = false;
    this.latestTranscript = "";

    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) {
        this.onError("Speech recognition is not supported in this browser. Please use text mode.");
        return false;
      }
    }

    try {
      if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      this.recognition.start();
      return true;
    } catch (error) {
      return false;
    }
  }

  public stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
    this.onStateChange?.("idle");
  }

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    return new Promise((resolve) => {
      let isResolved = false;
      const finish = () => {
        if (isResolved) return;
        isResolved = true;
        onEnd?.();
        resolve();
      };

      if (!isSpeechSynthesisSupported()) {
        onStart?.();
        setTimeout(finish, 1200);
        return;
      }

      window.speechSynthesis.cancel();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        finish();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      this.currentUtterance = utterance;

      // Detect language (Marathi / Hindi / English) and route to best Neural Human Voice
      const detectedLang = detectLanguage(cleaned);
      const { voice, langCode } = getBestVoiceForLanguage(detectedLang);

      if (detectedLang === "mr") {
        utterance.rate = 0.93;
        utterance.pitch = 1.02;
      } else if (detectedLang === "hi") {
        utterance.rate = 0.94;
        utterance.pitch = 1.02;
      } else {
        utterance.rate = 0.96;
        utterance.pitch = 1.0;
      }

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || langCode;
      } else {
        utterance.lang = langCode;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = () => {
        finish();
      };

      const maxEstimatedDurationMs = Math.max(2500, cleaned.length * 85 + 1500);
      setTimeout(finish, maxEstimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
