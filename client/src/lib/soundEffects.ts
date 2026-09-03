/**
 * ReVora Web Audio Synthesizer for Real-Time Merchant Notifications.
 *
 * Synthesizes a crisp, premium "Cash Chime / Payment Recovered Ding"
 * directly using the Web Audio API without needing external .mp3 assets,
 * ensuring zero network lag, zero 404s, and instant playback across all browsers.
 */

let audioCtx: AudioContext | null = null;

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
 * Plays a celebratory, premium "Cash Register / Success Ding" chime.
 * Chords: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz) -> G6 (1568Hz)
 * with a shimmering metallic harmonic tail.
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
      { freq: 2093.0, start: 0.32, dur: 0.95, gain: 0.25 },  // C7 (crystal shimmer)
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with slight triangle overtone for metallic chime warmth
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Attack and exponential decay envelope
      gainNode.gain.setValueAtTime(0.0001, now + note.start);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur + 0.05);
    });
  } catch (err) {
    // Graceful fallback — never crash the UI if audio playback is blocked by browser policy
    console.debug("[ReVora Audio] Sound playback skipped:", err);
  }
}
