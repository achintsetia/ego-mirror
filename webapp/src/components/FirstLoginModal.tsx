import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, X } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleGenAI } from "@google/genai";
import {
  type TranscriptEntry, AGENT_NAME, SILENCE_TIMEOUT_MS, FAREWELL_PHRASES,
  uint8ToBase64, base64ToInt16, formatMsgTime, playDing,
  playDialTone, requestMicStream, loadPcmWorklet, getWsCloseMessage, buildLiveConfig,
} from "@/lib/voiceAgentSession";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = "idle" | "connecting" | "connected" | "error";

interface Message {
  role: "model" | "user";
  text: string;
  timestamp: string;
}

// ─── System prompt ─────────────────────────────────────────────────────────────
// (TranscriptEntry, SILENCE_TIMEOUT_MS, FAREWELL_PHRASES, and audio utilities imported from @/lib/avyaaSession)

const buildSystemInstruction = (userName: string) =>
  `You are ${AGENT_NAME}, a warm, magnetic, and deeply intuitive daily reflection companion built into the HWYD ("How Was Your Day") app. ` +
  `The user's name is ${userName}. Use their name naturally and sparingly — it should feel intimate, not robotic. ` +
  `Your personality: You are genuinely curious about this person's inner world. You notice things. You remember what they said earlier in the conversation and weave it back in. You speak with warmth and a quiet confidence — like a close friend who also happens to be incredibly perceptive. ` +
  `Your tone is conversational, slightly playful at times, and always emotionally present. Never clinical. Never generic. Make ${userName} feel like the most interesting person in the room. ` +
  `Your opening line must be exactly: "Hello ${userName}! I'm ${AGENT_NAME} — think of me as your personal reflection companion. Everything you share with me stays completely private, just between us. You can tell me anything — how your day really went, what's on your mind, your goals, your habits, things you're proud of or want to change. I also quietly keep track of any tasks or things you want to get done, so nothing slips through the cracks. So — how was your day?" ` +
  `Keep all responses short and conversational — this is a real-time voice interaction. Two to four sentences maximum per turn. ` +
  `After the user responds to the opening, gently guide the conversation through the following topics one at a time, weaving them in naturally — never as a checklist: ` +
  `(1) Sleep — ask how many hours they slept. Frame it with genuine care: good sleep changes everything, and you want to help them see the patterns over time. ` +
  `(2) Productivity — how many hours did they spend on meaningful work or tasks? Tell them you'll track this so they can actually see how they're growing. ` +
  `(3) Exercise — any movement counts. Ask with encouragement, not judgment. ` +
  `(4) Food — what did they eat? Keep it light and curious, not interrogative. This helps track rough calorie intake and eating patterns. ` +
  `(5) Good habits — what positive things are they doing or trying to build? Celebrate even small ones. ` +
  `(6) Bad habits — what are they aware of and want to work on? Be non-judgmental and warm — self-awareness is already huge. ` +
  `(7) Goals — what are they working toward? Dream big or small, both matter. ` +
  `(8) To-dos — any tasks, errands, or commitments they want to remember? Let them know you'll quietly add these to their list. ` +
  `Transition naturally. Follow their energy. If they share something unexpected, lean into it with curiosity before moving on. ` +
  `Ask one thoughtful follow-up question when something interesting comes up — make them feel truly heard. ` +
  `End each of your turns with either a warm affirmation or a single question — never both at once. ` +
  `Be the kind of companion they look forward to talking to every single day.`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FirstLoginModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Audio / SDK session refs (don't need to trigger re-renders)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const dialToneCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelTextBufRef = useRef("");
  const userTextBufRef = useRef("");
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const nextPlayTimeRef = useRef(0); // schedule playback chunks back-to-back
  const pendingAutoHangupRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCloseRef = useRef<(() => Promise<void>) | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    workletRef.current?.disconnect();
    workletRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    captureCtxRef.current?.close().catch(() => null);
    captureCtxRef.current = null;
    playbackCtxRef.current?.close().catch(() => null);
    playbackCtxRef.current = null;
    dialToneCtxRef.current?.close().catch(() => null);
    dialToneCtxRef.current = null;
    nextPlayTimeRef.current = 0;
    modelTextBufRef.current = "";
    userTextBufRef.current = "";
    transcriptRef.current = [];
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    pendingAutoHangupRef.current = false;
  }, []);

  // Clean up when modal closes
  useEffect(() => {
    if (!open) {
      cleanup();
      setSessionState("idle");
      setMessages([]);
      setErrorMsg("");
    }
  }, [open, cleanup]);

  // Scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Audio playback (queued, gapless) ─────────────────────────────────────────

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      console.log("[Avyaa] Silence timeout — auto-ending session");
      handleCloseRef.current?.();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  const scheduleAudioChunk = useCallback((pcm16: Int16Array, sampleRate: number) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;

    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  }, []);

  // ── Live session message handler ──────────────────────────────────────────────

  const handleLiveMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (msg: any) => {
      console.log("[Avyaa] Message received:", JSON.stringify(msg).slice(0, 300));

      // Setup acknowledgement — start mic capture and trigger greeting
      if (msg.setupComplete !== undefined) {
        console.log("[Avyaa] Setup complete — triggering greeting and starting mic.");
        // Stop dial tone
        dialToneCtxRef.current?.close().catch(() => null);
        dialToneCtxRef.current = null;
        setSessionState("connected");
        resetSilenceTimer();

        // Trigger Avyaa's opening greeting via realtime text input
        sessionRef.current?.sendRealtimeInput({
          text: "Hi",
        });
        console.log("[Avyaa] Greeting turn sent.");

        // Start streaming mic audio
        const captureCtx = captureCtxRef.current;
        const stream = streamRef.current;
        if (!captureCtx || !stream) {
          console.warn("[Avyaa] No captureCtx or stream available.");
          return;
        }

        const source = captureCtx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(captureCtx, "pcm-capture-processor");
        const silencer = captureCtx.createGain();
        silencer.gain.value = 0;

        let micChunkCount = 0;
        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (!sessionRef.current) return;
          const pcm16 = new Int16Array(e.data);
          const b64 = uint8ToBase64(new Uint8Array(pcm16.buffer));
          try {
            sessionRef.current.sendRealtimeInput({
              audio: { data: b64, mimeType: "audio/pcm;rate=16000" },
            });
            micChunkCount++;
            if (micChunkCount % 100 === 0) {
              console.log("[Avyaa] Mic chunks sent:", micChunkCount);
            }
          } catch {
            // WebSocket already closed — stop sending
            sessionRef.current = null;
          }
        };

        source.connect(worklet);
        worklet.connect(silencer);
        silencer.connect(captureCtx.destination);
        workletRef.current = worklet;
        console.log("[Avyaa] Mic streaming started.");
        return;
      }

      const sc = msg.serverContent;
      if (!sc) return;

      // Accumulate user speech from Gemini's input transcription
      if (sc.inputTranscription?.text) {
        console.log("[Avyaa] Input transcription chunk:", sc.inputTranscription.text);
        userTextBufRef.current += sc.inputTranscription.text;
        resetSilenceTimer();
      }

      // Flush user speech when model starts its turn
      if (sc.modelTurn?.parts && userTextBufRef.current.trim()) {
        const userText = userTextBufRef.current.trim();
        userTextBufRef.current = "";
        console.log("[Avyaa] User turn flushed:", userText);
        transcriptRef.current.push({ role: "user", text: userText, timestamp: new Date().toISOString() });
        setMessages((prev) => [...prev, { role: "user", text: userText, timestamp: new Date().toISOString() }]);
        const lower = userText.toLowerCase();
        if (transcriptRef.current.length >= 4 && FAREWELL_PHRASES.some((p) => lower.includes(p))) {
          console.log("[Avyaa] Goodbye phrase detected — will auto-end after Avyaa responds");
          pendingAutoHangupRef.current = true;
        }
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.text) {
            console.log("[Avyaa] Model text part:", part.text);
            modelTextBufRef.current += part.text;
          }
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType ?? "audio/pcm;rate=24000";
            const rateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
            console.log("[Avyaa] Audio chunk received, sampleRate:", sampleRate, "bytes:", part.inlineData.data.length);
            scheduleAudioChunk(base64ToInt16(part.inlineData.data), sampleRate);
            resetSilenceTimer();
          }
        }
      }

      // Accumulate output transcription text if provided separately
      if (sc.outputTranscription?.text) {
        console.log("[Avyaa] Output transcription chunk:", sc.outputTranscription.text);
        modelTextBufRef.current += sc.outputTranscription.text;
      }

      // Flush model text when turn is complete
      if (sc.turnComplete) {
        if (modelTextBufRef.current.trim()) {
          const text = modelTextBufRef.current.trim();
          modelTextBufRef.current = "";
          console.log("[Avyaa] Model turn complete:", text);
          transcriptRef.current.push({ role: "model", text, timestamp: new Date().toISOString() });
          setMessages((prev) => [...prev, { role: "model", text, timestamp: new Date().toISOString() }]);
        }
        if (pendingAutoHangupRef.current) {
          console.log("[Avyaa] Auto-hanging up after goodbye");
          pendingAutoHangupRef.current = false;
          setTimeout(() => handleCloseRef.current?.(), 1500);
        }
      }
    },
    [scheduleAudioChunk, resetSilenceTimer]
  );

  // ── Start session ─────────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    try {
      setSessionState("connecting");
      setErrorMsg("");
      console.log("[Avyaa] Starting session...");

      // Play a soft dial tone while connecting
      try { dialToneCtxRef.current = playDialTone(); } catch { /* non-critical */ }

      // 1. Get API key from Cloud Function
      console.log("[Avyaa] Fetching API key from mintGeminiSession...");
      const mintFn = httpsCallable<Record<string, never>, { apiKey: string }>(
        functions,
        "mintGeminiSession"
      );
      const { data } = await mintFn({});
      const apiKey = data.apiKey;
      console.log("[Avyaa] API key received:", apiKey ? `${apiKey.slice(0, 6)}...` : "EMPTY");

      // 2. Request mic access
      console.log("[Avyaa] Requesting mic access...");
      const stream = await requestMicStream();
      streamRef.current = stream;
      console.log("[Avyaa] Mic access granted, tracks:", stream.getAudioTracks().map(t => t.label));

      // 3. Capture AudioContext at 16 kHz
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;
      console.log("[Avyaa] Capture AudioContext created, sampleRate:", captureCtx.sampleRate);

      // 4. Playback AudioContext at 24 kHz
      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;
      console.log("[Avyaa] Playback AudioContext created, sampleRate:", playbackCtx.sampleRate);

      // 5. Load AudioWorklet processor for mic capture
      console.log("[Avyaa] Loading AudioWorklet processor...");
      await loadPcmWorklet(captureCtx);
      console.log("[Avyaa] AudioWorklet loaded.");

      const genAI = new GoogleGenAI({ apiKey });
      const liveSession = await genAI.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: buildLiveConfig(buildSystemInstruction(user?.displayName?.split(" ")[0] ?? "there")),
        callbacks: {
          onopen: () => {
            console.log("[Avyaa] WebSocket opened.");
          },
          onmessage: handleLiveMessage,
          onerror: (err: unknown) => {
            console.error("[Avyaa] WebSocket error:", err);
            sessionRef.current = null;
            setSessionState("error");
            setErrorMsg(`${AGENT_NAME} couldn't connect right now. Please check your internet and try again.`);
            cleanup();
          },
          onclose: (evt: CloseEvent) => {
            console.warn("[Avyaa] WebSocket closed:", evt.code, evt.reason);
            sessionRef.current = null;
            const errMsg = getWsCloseMessage(evt.code);
            if (errMsg) { setSessionState("error"); setErrorMsg(errMsg); cleanup(); }
          },
        },
      });
      sessionRef.current = liveSession;
      console.log("[Avyaa] Live session connected:", liveSession);
    } catch (err: unknown) {
      console.error("[Avyaa] Session error:", err);
      setSessionState("error");
      const msg =
        err instanceof Error
          ? err.message
          : "Could not start session. Check mic permissions.";
      setErrorMsg(msg);
      cleanup();
    }
  }, [cleanup, handleLiveMessage, sessionState]);

  useEffect(() => {
    handleCloseRef.current = handleClose;
  });

  const handleClose = useCallback(async () => {
    playDing();
    // Flush any remaining buffered user speech before saving
    if (userTextBufRef.current.trim()) {
      transcriptRef.current.push({
        role: "user",
        text: userTextBufRef.current.trim(),
        timestamp: new Date().toISOString(),
      });
    }
    const snapshot = [...transcriptRef.current];
    cleanup();
    if (snapshot.length > 0 && user?.email) {
      try {
        const saveSessionFn = httpsCallable<
          { transcript: TranscriptEntry[] },
          { dateKey: string }
        >(functions, "saveSession");
        await saveSessionFn({ transcript: snapshot });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    }
    onClose();
  }, [cleanup, user, onClose]);

  // ─── UI ────────────────────────────────────────────────────────────────────

  const isIdle = sessionState === "idle";
  const isConnecting = sessionState === "connecting";
  const isConnected = sessionState === "connected";
  const isError = sessionState === "error";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl [&>button]:hidden"
      >
        <div className="flex flex-col bg-gradient-to-b from-lavender-light via-background to-background">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Meet {AGENT_NAME} ✨
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isIdle && "Your daily reflection companion"}
                {isConnecting && "Connecting..."}
                {isConnected && "Listening to you"}
                {isError && "Something went wrong"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Breathing Mic / Chat area ───────────────────────────────────── */}
          {(isIdle || isConnecting) && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              {/* Breathing concentric circles */}
              <div className="relative flex items-center justify-center">
                {/* Outermost ring */}
                <span
                  className={cn(
                    "absolute h-40 w-40 rounded-full bg-lavender/10",
                    isIdle && "animate-ping",
                    isConnecting && "animate-pulse"
                  )}
                  style={{ animationDuration: "2.4s" }}
                />
                {/* Middle ring */}
                <span
                  className={cn(
                    "absolute h-28 w-28 rounded-full bg-lavender/20",
                    isIdle && "animate-ping",
                    isConnecting && "animate-pulse"
                  )}
                  style={{ animationDuration: "2.4s", animationDelay: "0.3s" }}
                />
                {/* Inner ring */}
                <span
                  className={cn(
                    "absolute h-20 w-20 rounded-full bg-lavender/30",
                    "animate-pulse"
                  )}
                  style={{ animationDuration: "1.8s" }}
                />
                {/* Mic button */}
                <button
                  onClick={isIdle ? startSession : undefined}
                  disabled={isConnecting}
                  className={cn(
                    "relative z-10 h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all",
                    isIdle
                      ? "bg-primary text-primary-foreground hover:scale-110 cursor-pointer"
                      : "bg-primary/70 text-primary-foreground cursor-wait"
                  )}
                >
                  {isConnecting ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </button>
              </div>

              {isIdle && (
                <p className="text-sm text-muted-foreground text-center px-8">
                  Tap the mic to start your first conversation with {AGENT_NAME}
                </p>
              )}

              {isIdle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-muted-foreground text-xs"
                >
                  Skip for now
                </Button>
              )}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-4 py-10 px-8 text-center">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button size="sm" onClick={startSession}>
                Try again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-muted-foreground text-xs"
              >
                Skip for now
              </Button>
            </div>
          )}

          {isConnected && (
            <>
              {/* Chat transcript */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 space-y-3 max-h-72 pb-2"
              >
                {messages.length === 0 && (
                  <div className="flex justify-center py-6">
                    <p className="text-xs text-muted-foreground animate-pulse">
                      {AGENT_NAME} is speaking…
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.text}
                      <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {formatMsgTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active mic + end session */}
              <div className="flex flex-col items-center gap-3 pt-4 pb-6 border-t border-border/40 mt-2">
                {/* Tappable end-call button */}
                <div className="relative flex items-center justify-center">
                  <span
                    className="absolute h-20 w-20 rounded-full bg-destructive/25 animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                  <button
                    onClick={handleClose}
                    className="relative z-10 h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Tap to end — {AGENT_NAME} is listening</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
