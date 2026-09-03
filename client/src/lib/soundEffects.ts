/**
 * ReVora Web Audio Synthesizer & Cloudinary Audio Player for Real-Time Notifications.
 *
 * Plays customer audio notification from Cloudinary CDN with local asset and Web Audio fallbacks.
 */

const CLOUDINARY_CUSTOMER_AUDIO_URL = "https://res.cloudinary.com/dyqto9hz/video/upload/v1788461780/customer-notification.mp3";
const LOCAL_CUSTOMER_AUDIO_URL = "/assets/customer-notification.mp3";

let audioCtx: AudioContext | null = null;
let preloadedCustomerAudio: HTMLAudioElement | null = null;

// Preload the Cloudinary customer audio on client init for instant playback
if (typeof window !== "undefined") {
  try {
    preloadedCustomerAudio = new Audio(CLOUDINARY_CUSTOMER_AUDIO_URL);
    preloadedCustomerAudio.preload = "auto";
  } catch (e) {
    // ignore
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a celebratory, premium "Cash Register / Success Ding" chime on merchant screen.
 */
export function playPaymentRecoveredSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Harmonically tuned frequencies (C Major ascending arpeggio with bright shimmer)
    const notes = [
      { freq: 783.99, start: 0.0, dur: 0.45, gain: 0.28 },   // G5
      { freq: 1046.5, start: 0.08, dur: 0.55, gain: 0.32 },  // C6
      { freq: 1318.51, start: 0.16, dur: 0.65, gain: 0.35 }, // E6
      { freq: 1567.98, start: 0.24, dur: 0.85, gain: 0.4 },  // G6
      { freq: 2093.0, start: 0.32, dur: 0.95, gain: 0.25 },  // C7
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gainNode.gain.setValueAtTime(0.0001, now + note.start);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur + 0.05);
    });
  } catch (err) {
    console.debug("[ReVora Audio] Sound playback skipped:", err);
  }
}

/**
 * Plays the customer notification sound from Cloudinary CDN on the customer's phone
 * when their Razorpay payment is verified and completed.
 */
export function playCustomerNotificationSound(): void {
  try {
    const audio = preloadedCustomerAudio || new Audio(CLOUDINARY_CUSTOMER_AUDIO_URL);
    audio.volume = 1.0;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback 1: Local MP3
        try {
          const fallbackAudio = new Audio(LOCAL_CUSTOMER_AUDIO_URL);
          fallbackAudio.play().catch(() => playPaymentRecoveredSound());
        } catch {
          playPaymentRecoveredSound();
        }
      });
    }
  } catch (err) {
    console.debug("[CustomerAudio] Audio error fallback:", err);
    playPaymentRecoveredSound();
  }
}
