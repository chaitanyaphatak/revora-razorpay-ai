/**
 * Zero-cost, in-browser Speech Service using standard Web Speech API.
 * - Speech-to-Text (STT): webkitSpeechRecognition / SpeechRecognition
 * - Text-to-Speech (TTS): window.speechSynthesis
 * - No paid third-party voice providers (Twilio, Vapi, ElevenLabs, etc.)
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
 * Finds the highest quality Indian / Hindi / Hinglish voice available in the browser.
 * Prioritizes natural neural voices (Edge / Chrome) over legacy robotic voices.
 */
export function getBestIndianVoice(): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (voices.length === 0) return null;

  // Priority order for natural, crystal clear articulation:
  // 1. Microsoft Neural Indian voices (Edge) - studio quality
  const neuralHindi = voices.find(
    (v) =>
      (v.name.includes("Swara") || v.name.includes("Madhur")) &&
      v.name.includes("Natural"),
  );
  if (neuralHindi) return neuralHindi;

  const neuralIndianEnglish = voices.find(
    (v) =>
      (v.name.includes("Neerja") || v.name.includes("Prabhat")) &&
      v.name.includes("Natural"),
  );
  if (neuralIndianEnglish) return neuralIndianEnglish;

  // 2. Google Hindi / Indian English (Chrome)
  const googleHindi = voices.find(
    (v) =>
      v.name.includes("Google") &&
      (v.lang.startsWith("hi") || v.name.includes("हिन्दी") || v.name.includes("Hindi")),
  );
  if (googleHindi) return googleHindi;

  const googleIndianEnglish = voices.find(
    (v) => v.name.includes("Google") && (v.lang === "en-IN" || v.name.includes("India")),
  );
  if (googleIndianEnglish) return googleIndianEnglish;

  // 3. Any Hindi voice (hi-IN, hi)
  const anyHindi = voices.find(
    (v) => v.lang.startsWith("hi") || v.name.toLowerCase().includes("hindi"),
  );
  if (anyHindi) return anyHindi;

  // 4. Any Indian English voice (en-IN)
  const anyIndianEnglish = voices.find(
    (v) =>
      v.lang.includes("en-IN") ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("heera") ||
      v.name.toLowerCase().includes("kalpana"),
  );
  if (anyIndianEnglish) return anyIndianEnglish;

  // 5. Any natural English voice
  const anyNaturalEnglish = voices.find(
    (v) => v.name.includes("Natural") && v.lang.startsWith("en"),
  );
  if (anyNaturalEnglish) return anyNaturalEnglish;

  return voices[0] || null;
}

/**
 * Cleans text for speech synthesis so the engine doesn't stutter on emojis or markdown
 */
function cleanTextForSpeech(rawText: string): string {
  return rawText
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s+/g, "")
    // Remove emojis (surrogate pairs) and symbols
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    // Replace currency symbol with readable word
    .replace(/₹\s*([0-9,]+)/g, "$1 rupees")
    .replace(/INR\s*([0-9,]+)/gi, "$1 rupees")
    // Clean extra whitespace
    .replace(/\s+/g, " ")
    .trim();
}


export class BrowserSpeechController {
  private recognition: any = null;
  private isListening = false;
  private preferredLanguage = "hi-IN"; // Hinglish / Indian Hindi default, also listens to Indian English
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
    this.latestTranscript = "";
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.stopListening();
    this.onTranscript(trimmed, true);
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    // Auto-commit on 600ms of silence (ultra-responsive on mobile & desktop)
    this.silenceTimer = setTimeout(() => {
      if (this.latestTranscript.trim() && !this.hasCommittedFinal) {
        this.commitTranscript(this.latestTranscript);
      }
    }, 600);
  }

  private initRecognition() {
    if (!isSpeechRecognitionSupported()) return;
    const win = window as IWindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.preferredLanguage;

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
          // If we had recorded speech before no-speech error, commit it
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
        // Critical for Mobile: if recognition ended on silence and had uncommitted speech, commit it now!
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
      } catch {
        // Ignore
      }
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
      
      // Calibrated rate for crystal clear Hinglish pronunciation (not rushed)
      utterance.rate = 0.94;
      utterance.pitch = 1.0;

      const bestVoice = getBestIndianVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || "hi-IN";
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

      // Safety timeout for mobile browsers where utterance.onend might not fire reliably
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


