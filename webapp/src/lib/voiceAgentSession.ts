import { Modality, StartSensitivity, EndSensitivity } from "@google/genai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptEntry {
  role: "model" | "user";
  text: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** The display name of the voice agent. Change here to rename globally. */
export const AGENT_NAME = "Avyaa";

export const SILENCE_TIMEOUT_MS = 45_000;

export const FAREWELL_PHRASES = [
  "thank you", "thanks", "thank you so much", "thanks so much",
  "bye", "goodbye", "good bye", "bye bye",
  "that's all", "that is all", "i'm done", "i am done",
  "see you", "have a good day", "take care",
];

/** AudioWorklet code that captures mic PCM at 16 kHz and posts it back as ArrayBuffer. */
export const PCM_PROCESSOR_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      const pcm16 = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(channel[i] * 32767)));
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-capture-processor", PCMCaptureProcessor);
`;

// ─── Encoding helpers ─────────────────────────────────────────────────────────

export function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

export function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ─── Audio helpers ────────────────────────────────────────────────────────────

/** Plays a short descending ding to signal call end. Non-throwing. */
export function playDing(): void {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => ctx.close();
  } catch { /* non-critical */ }
}

/**
 * Starts a telephony-style dial tone (350 Hz + 440 Hz).
 * Returns the AudioContext so the caller can close it when the session connects.
 */
export function playDialTone(): AudioContext {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  gain.connect(ctx.destination);
  [350, 440].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
  });
  return ctx;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Requests a 16 kHz mono microphone stream with echo/noise cancellation. */
export function requestMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
}

/** Compiles and loads the PCM capture AudioWorklet into the given AudioContext. */
export async function loadPcmWorklet(captureCtx: AudioContext): Promise<void> {
  const blob = new Blob([PCM_PROCESSOR_CODE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  await captureCtx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
}

/**
 * Returns a user-facing error string for a non-clean WebSocket close,
 * or null if the close was clean (code 1000).
 */
export function getWsCloseMessage(code: number): string | null {
  if (code === 1000) return null;
  if (code === 1006) return "The connection dropped. Please check your internet and try again.";
  if (code === 1008 || code === 1003) return `${AGENT_NAME} isn't available right now. Please try again in a moment.`;
  if (code === 1011) return "Something went wrong on our end. Please try again shortly.";
  return "The conversation ended unexpectedly. Please try again.";
}

// ─── Gemini Live config ───────────────────────────────────────────────────────

/** Builds the Gemini Live session config object for a given system instruction string. */
export function buildLiveConfig(systemInstruction: string) {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        prefixPaddingMs: 200,
        silenceDurationMs: 2500,
      },
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };
}
