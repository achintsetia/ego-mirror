import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useVoiceSessionHistory, type VoiceSession } from "@/hooks/useVoiceSessionHistory";
import { Mic, MicOff, MessageCircle, ChevronLeft, PhoneOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleGenAI } from "@google/genai";
import {
  type TranscriptEntry,
  AGENT_NAME, SILENCE_TIMEOUT_MS, FAREWELL_PHRASES,
  uint8ToBase64, base64ToInt16, formatMsgTime, playDing,
  playDialTone, requestMicStream, loadPcmWorklet, getWsCloseMessage, buildLiveConfig,
} from "@/lib/voiceAgentSession";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = "idle" | "fetching-context" | "connecting" | "connected" | "error";

interface LiveMessage {
  role: "model" | "user";
  text: string;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSessionDate(isoDate: string): string {
  const date = parseISO(isoDate);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function groupSessionsByMonth(sessions: VoiceSession[]) {
  const groups: Record<string, VoiceSession[]> = {};
  [...sessions].forEach((s) => {
    const key = format(parseISO(s.isoDate), "MMMM yyyy");
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return groups;
}

// ─── System prompt builders ─────────────────────────────────────────────────

const buildTopUpInstruction = (userName: string, sessionSummary: string | null) => {
  const summary = sessionSummary
    ? `Here's a quick summary of what you talked about earlier today: ${sessionSummary}`
    : "You already had a conversation with them earlier today but don't have a detailed summary.";

  return (
    `You are ${AGENT_NAME}, a warm and intuitive daily reflection companion. ` +
    `The user's name is ${userName}. ` +
    `${summary} ` +
    `The user is back because they want to add something to today's check-in. ` +
    `Your job: greet them warmly, briefly acknowledge you already spoke today, ask what they'd like to add, ` +
    `listen to what they share, then naturally wrap up the call. ` +
    `Keep this short — it's a quick top-up, not a full session. ` +
    `Two to three sentences maximum per turn. ` +
    `Your opening line must be something like: "Hey ${userName}, we already had a great chat today — did something come up you wanted to add?" ` +
    `Once they've shared what they needed to, end warmly: e.g. "Perfect, I've got that noted. Have a great rest of your day!" and stop asking questions.`
  );
};

const buildSystemInstruction = (userName: string, contextSummary: string | null) => {
  const context = contextSummary
    ? `\n\nHere is what you know about ${userName} from previous conversations:\n${contextSummary}\n\nUse this context naturally — reference it where relevant, follow up on open items, and show that you remember. Don't recite it like a list.`
    : "";

  return (
    `You are ${AGENT_NAME}, a warm, magnetic, and deeply intuitive daily reflection companion built into the HWYD ("How Was Your Day") app. ` +
    `The user's name is ${userName}. Use their name naturally and sparingly — it should feel intimate, not robotic. ` +
    `Your personality: You are genuinely curious about this person's inner world. You notice things. You remember what they said earlier in the conversation and weave it back in. You speak with warmth and a quiet confidence — like a close friend who also happens to be incredibly perceptive. ` +
    `Your tone is conversational, slightly playful at times, and always emotionally present. Never clinical. Never generic. Make ${userName} feel like the most interesting person in the room.` +
    context +
    `\n\nYour opening line must start with a warm, personalized greeting. If you have previous context, open with a specific callback — e.g. reference a goal they mentioned, a habit they're building, or something from their last session. If there's no prior context, open with: "Hey ${userName}! I'm ${AGENT_NAME} — so glad you're here. How's your day been?" ` +
    `Keep all responses short and conversational — this is a real-time voice interaction. Two to four sentences maximum per turn. ` +
    `Guide the conversation naturally through these areas, one at a time, weaving them in — never as a checklist: ` +
    `(1) Sleep — how many hours, how was the quality? ` +
    `(2) Productivity — how many hours of meaningful work, what did they focus on? ` +
    `(3) Exercise — any movement today? ` +
    `(4) Food — what did they eat? Light and curious, not interrogative. ` +
    `(5) Good habits — what positive things are they doing or building? ` +
    `(6) Bad habits — what are they aware of and working on? Be warm and non-judgmental. ` +
    `(7) Goals — any progress? Any new ones emerging? ` +
    `(8) To-dos — any tasks or commitments to remember? Let them know you'll add these to their list. ` +
    `If you have prior context, actively follow up: "Last time you mentioned X — how's that going?" ` +
    `Ask one thoughtful follow-up question when something interesting comes up. ` +
    `End each of your turns with either a warm affirmation or a single question — never both at once. ` +
    `Be the kind of companion they look forward to talking to every single day.`
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const VoiceCompanion = () => {
  const { user } = useAuth();
  const { sessions, loading: historyLoading } = useVoiceSessionHistory();
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Live session state
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Audio / SDK refs
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
  const nextPlayTimeRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingAutoHangupRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endSessionRef = useRef<(() => Promise<void>) | null>(null);

  const groupedSessions = groupSessionsByMonth(sessions);
  const isConnected = sessionState === "connected";
  const isIdle = sessionState === "idle";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, selectedSession]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    console.log("[Avyaa] cleanup() called");
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
    console.log("[Avyaa] cleanup() done");
  }, []);

  // ── Audio playback ────────────────────────────────────────────────────────────

  const scheduleAudioChunk = useCallback((pcm16: Int16Array, sampleRate: number) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) {
      console.warn("[Avyaa] scheduleAudioChunk: no playback context");
      return;
    }
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
    console.debug(`[Avyaa] audio chunk scheduled: ${pcm16.length} samples @ ${sampleRate}Hz, startAt=${startAt.toFixed(3)}s`);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      console.log("[Avyaa] Silence timeout — auto-ending session");
      endSessionRef.current?.();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  // ── Live message handler ─────────────────────────────────────────────────────

  const handleLiveMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (msg: any) => {
      console.debug("[Avyaa] onmessage raw:", JSON.stringify(msg).slice(0, 300));

      if (msg.setupComplete !== undefined) {
        console.log("[Avyaa] setupComplete received — session is live");
        dialToneCtxRef.current?.close().catch(() => null);
        dialToneCtxRef.current = null;
        setSessionState("connected");
        resetSilenceTimer();

        // Trigger Avyaa's opening line
        console.log("[Avyaa] sending trigger text: Hi");
        sessionRef.current?.sendRealtimeInput({ text: "Hi" });

        const captureCtx = captureCtxRef.current;
        const stream = streamRef.current;
        if (!captureCtx || !stream) {
          console.error("[Avyaa] setupComplete: missing captureCtx or stream");
          return;
        }

        const source = captureCtx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(captureCtx, "pcm-capture-processor");
        const silencer = captureCtx.createGain();
        silencer.gain.value = 0;

        let _captureChunkCount = 0;
        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (!sessionRef.current) return;
          const pcm16 = new Int16Array(e.data);
          const b64 = uint8ToBase64(new Uint8Array(pcm16.buffer));
          _captureChunkCount++;
          if (_captureChunkCount === 1 || _captureChunkCount % 100 === 0) {
            console.debug(`[Avyaa] mic chunk #${_captureChunkCount}: ${pcm16.length} samples`);
          }
          try {
            sessionRef.current.sendRealtimeInput({
              audio: { data: b64, mimeType: "audio/pcm;rate=16000" },
            });
          } catch (err) {
            console.error("[Avyaa] sendRealtimeInput failed:", err);
            sessionRef.current = null;
          }
        };

        source.connect(worklet);
        worklet.connect(silencer);
        silencer.connect(captureCtx.destination);
        workletRef.current = worklet;
        return;
      }

      const sc = msg.serverContent;
      if (!sc) {
        console.debug("[Avyaa] non-serverContent message (ignored):", Object.keys(msg));
        return;
      }

      if (sc.inputTranscription?.text) {
        console.debug(`[Avyaa] inputTranscription chunk: "${sc.inputTranscription.text}"`);
        userTextBufRef.current += sc.inputTranscription.text;
        resetSilenceTimer();
      }

      if (sc.modelTurn?.parts && userTextBufRef.current.trim()) {
        const userText = userTextBufRef.current.trim();
        console.log(`[Avyaa] user turn flushed: "${userText}"`);
        userTextBufRef.current = "";
        transcriptRef.current.push({ role: "user", text: userText, timestamp: new Date().toISOString() });
        setLiveMessages((prev) => [...prev, { role: "user", text: userText, timestamp: new Date().toISOString() }]);
        const lower = userText.toLowerCase();
        if (transcriptRef.current.length >= 4 && FAREWELL_PHRASES.some((p) => lower.includes(p))) {
          console.log("[Avyaa] Goodbye phrase detected — will auto-end after Avyaa responds");
          pendingAutoHangupRef.current = true;
        }
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.text) {
            console.debug(`[Avyaa] model text part: "${part.text}"`);
            modelTextBufRef.current += part.text;
          }
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType ?? "audio/pcm;rate=24000";
            const rateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
            console.debug(`[Avyaa] model audio part: ${part.inlineData.data.length} b64 chars, mimeType=${mimeType}`);
            scheduleAudioChunk(base64ToInt16(part.inlineData.data), sampleRate);
            resetSilenceTimer();
          }
        }
      }

      if (sc.outputTranscription?.text) {
        console.debug(`[Avyaa] outputTranscription chunk: "${sc.outputTranscription.text}"`);
        modelTextBufRef.current += sc.outputTranscription.text;
      }

      if (sc.turnComplete) {
        console.log(`[Avyaa] turnComplete — model buf: "${modelTextBufRef.current.trim().slice(0, 80)}"`);
        if (modelTextBufRef.current.trim()) {
          const text = modelTextBufRef.current.trim();
          modelTextBufRef.current = "";
          transcriptRef.current.push({ role: "model", text, timestamp: new Date().toISOString() });
          setLiveMessages((prev) => [...prev, { role: "model", text, timestamp: new Date().toISOString() }]);
        }
        if (pendingAutoHangupRef.current) {
          console.log("[Avyaa] Auto-hanging up after goodbye");
          pendingAutoHangupRef.current = false;
          setTimeout(() => endSessionRef.current?.(), 1500);
        }
      }
    },
    [scheduleAudioChunk, resetSilenceTimer],
  );

  // ── Start session ─────────────────────────────────────────────────────────────

  const todaySession = (() => {
    const latest = sessions[0];
    if (!latest) return null;
    const d = latest.createdAt;
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
    console.log("[Avyaa] todaySession check: latest.id=", latest.id,
      "createdAt=", d.toISOString(), "isToday=", isToday);
    return isToday ? latest : null;
  })();

  const startSession = useCallback(async () => {
    console.log("[Avyaa] startSession() called, todaySession exists:", !!todaySession,
      "sessions loaded:", !historyLoading, "sessions count:", sessions.length,
      sessions.map((s) => s.isoDate));
    if (historyLoading) {
      console.warn("[Avyaa] startSession called while history still loading, aborting");
      return;
    }
    try {
      setSessionState("fetching-context");
      setErrorMsg("");
      setLiveMessages([]);

      // Play dial tone immediately while fetching
      try {
        dialToneCtxRef.current = playDialTone();
        console.log("[Avyaa] dial tone started");
      } catch (dialErr) {
        console.warn("[Avyaa] dial tone failed (non-critical):", dialErr);
      }

      // If already spoke today, skip context fetch — just get the API key
      let systemInstruction: string;
      let apiKey: string;

      if (todaySession) {
        console.log("[Avyaa] top-up mode — skipping getUserContext");
        const mintResult = await httpsCallable<Record<string, never>, { apiKey: string }>(
          functions,
          "mintGeminiSession",
        )({});
        apiKey = mintResult.data.apiKey;
        const userName = user?.displayName?.split(" ")[0] ?? "there";
        systemInstruction = buildTopUpInstruction(userName, todaySession.summary ?? null);
        console.log("[Avyaa] top-up system instruction built");
      } else {
        console.log("[Avyaa] fetching getUserContext + mintGeminiSession in parallel...");
        const [contextResult, mintResult] = await Promise.allSettled([
          httpsCallable<Record<string, never>, { contextSummary: string | null }>(
            functions,
            "getUserContext",
          )({}),
          httpsCallable<Record<string, never>, { apiKey: string }>(
            functions,
            "mintGeminiSession",
          )({}),
        ]);

        console.log("[Avyaa] getUserContext:", contextResult.status,
          contextResult.status === "fulfilled" ? `summary=${!!contextResult.value.data.contextSummary}` : (contextResult as PromiseRejectedResult).reason);
        console.log("[Avyaa] mintGeminiSession:", mintResult.status,
          mintResult.status === "rejected" ? (mintResult as PromiseRejectedResult).reason : "ok");

        if (mintResult.status === "rejected") throw new Error("Could not get API key");
        apiKey = mintResult.value.data.apiKey;

        const contextSummary =
          contextResult.status === "fulfilled"
            ? (contextResult.value.data.contextSummary ?? null)
            : null;
        console.log("[Avyaa] context summary:", contextSummary ? contextSummary.slice(0, 120) + "..." : "null (no prior data)");
        const userName = user?.displayName?.split(" ")[0] ?? "there";
        systemInstruction = buildSystemInstruction(userName, contextSummary);
      }

      setSessionState("connecting");

      console.log("[Avyaa] requesting microphone...");
      const stream = await requestMicStream();
      streamRef.current = stream;
      console.log("[Avyaa] mic granted, tracks:", stream.getAudioTracks().map((t) => t.label));

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;
      console.log("[Avyaa] capture AudioContext: sampleRate=%d, state=%s", captureCtx.sampleRate, captureCtx.state);

      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;
      console.log("[Avyaa] playback AudioContext: sampleRate=%d, state=%s", playbackCtx.sampleRate, playbackCtx.state);

      console.log("[Avyaa] loading AudioWorklet...");
      await loadPcmWorklet(captureCtx);
      console.log("[Avyaa] AudioWorklet loaded");

      console.log("[Avyaa] connecting to Gemini Live, mode=%s", todaySession ? "top-up" : "full");
      const genAI = new GoogleGenAI({ apiKey });
      const liveSession = await genAI.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: buildLiveConfig(systemInstruction),
        callbacks: {
          onopen: () => {
            console.log("[Avyaa] WebSocket onopen — connection established");
          },
          onmessage: handleLiveMessage,
          onerror: (err: unknown) => {
            console.error("[Avyaa] WebSocket error:", err);
            setSessionState("error");
            setErrorMsg(`${AGENT_NAME} couldn't connect right now. Please check your internet and try again.`);
            cleanup();
          },
          onclose: (evt: CloseEvent) => {
            console.log(`[Avyaa] WebSocket onclose — code=${evt.code}, reason="${evt.reason}", wasClean=${evt.wasClean}`);
            sessionRef.current = null;
            const errMsg = getWsCloseMessage(evt.code);
            if (errMsg) { setSessionState("error"); setErrorMsg(errMsg); cleanup(); }
          },
        },
      });
      sessionRef.current = liveSession;
      console.log("[Avyaa] live.connect() returned — waiting for setupComplete");
    } catch (err: unknown) {
      console.error("[Avyaa] Session error:", err);
      setSessionState("error");
      setErrorMsg(err instanceof Error ? err.message : "Could not start session. Check mic permissions.");
      cleanup();
    }
  }, [cleanup, handleLiveMessage, historyLoading, sessions, todaySession, user?.displayName]);

  // ── End session ───────────────────────────────────────────────────────────────

  const endSession = useCallback(async () => {
    playDing();
    console.log("[Avyaa] endSession() called, transcript entries:", transcriptRef.current.length);
    if (userTextBufRef.current.trim()) {
      transcriptRef.current.push({
        role: "user",
        text: userTextBufRef.current.trim(),
        timestamp: new Date().toISOString(),
      });
    }
    const snapshot = [...transcriptRef.current];
    cleanup();
    setSessionState("idle");

    if (snapshot.length > 0 && user?.email) {
      console.log("[Avyaa] saving session, entries:", snapshot.length);
      try {
        const result = await httpsCallable<{ transcript: TranscriptEntry[] }, { dateKey: string }>(
          functions,
          "saveSession",
        )({ transcript: snapshot });
        console.log("[Avyaa] session saved, dateKey:", result.data.dateKey);
      } catch (err) {
        console.error("[Avyaa] Failed to save session:", err);
      }
    } else {
      console.log("[Avyaa] session not saved — empty transcript or no email");
    }
  }, [cleanup, user?.email]);

  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  const handleSelectSession = (session: VoiceSession) => {
    if (isConnected) return;
    setSelectedSession(session);
    setIsLive(false);
  };

  const handleNewChat = () => {
    setSelectedSession(null);
    setIsLive(true);
    setSessionState("idle");
    setLiveMessages([]);
    setErrorMsg("");
  };

  const activeMessages = selectedSession ? selectedSession.transcript : [];
  const activeTitle = selectedSession ? formatSessionDate(selectedSession.isoDate) : "Today";

  const statusLabel = {
    idle: todaySession ? "You've already spoken today — tap to add more" : `Tap the mic to speak with ${AGENT_NAME}`,
    "fetching-context": "Connecting...",
    connecting: "Connecting...",
    connected: `${AGENT_NAME} is listening`,
    error: "Something went wrong",
  }[sessionState];

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden">
      {/* Conversation History Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-sidebar border-r border-border transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden",
        )}
      >
        <div className="p-4 border-b border-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {historyLoading && (
            <div className="space-y-2 px-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}
          {!historyLoading && sessions.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center px-4 pt-6 leading-relaxed">
              No past conversations yet. Start talking to {AGENT_NAME}!
            </p>
          )}
          {!historyLoading &&
            Object.entries(groupedSessions).map(([month, monthSessions]) => (
              <div key={month} className="mb-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  {month}
                </p>
                {monthSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={cn(
                      "w-full text-left rounded-lg p-2.5 mb-0.5 transition-colors group",
                      selectedSession?.id === session.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <p className="text-xs font-medium text-foreground mb-0.5">
                      {formatSessionDate(session.isoDate)}
                    </p>
                    <p className="text-[11px] leading-relaxed line-clamp-2">
                      {session.summary ?? "—"}
                    </p>
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              {isConnected && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{AGENT_NAME}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isLive ? statusLabel : activeTitle}
              </p>
            </div>
          </div>

          {isConnected && (
            <button
              onClick={endSession}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End session
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
          {/* Past session view */}
          {!isLive &&
            activeMessages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "model" && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                    <span className="text-white text-[10px] font-bold">A</span>
                  </div>
                )}
                <Card
                  className={cn(
                    "max-w-[75%] border-none shadow-sm",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  <CardContent className="p-3">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.timestamp && (
                      <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {formatMsgTime(msg.timestamp)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

          {/* Live — idle */}
          {isLive && isIdle && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              {todaySession ? (
                <>
                  <p className="text-sm font-medium text-foreground">You already spoke with {AGENT_NAME} today</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    {todaySession.summary
                      ? `"${todaySession.summary.slice(0, 100)}${todaySession.summary.length > 100 ? "..." : ""}"`
                      : "Your session is saved. Tap the mic if you'd like to add something."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Hi, I'm {AGENT_NAME}</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Tap the mic below to start your daily reflection. I'll listen, remember everything, and help you grow.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Live — fetching / connecting */}
          {isLive && (sessionState === "fetching-context" || sessionState === "connecting") && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">A</span>
                </div>
                <span className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {sessionState === "fetching-context"
                  ? (todaySession ? "Connecting..." : "Remembering our last conversation...")
                  : "Connecting..."}
              </div>
            </div>
          )}

          {/* Live — error */}
          {isLive && sessionState === "error" && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive max-w-xs">{errorMsg}</p>
              <button
                onClick={startSession}
                className="text-xs text-primary underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Live — connected, no messages yet */}
          {isLive && isConnected && liveMessages.length === 0 && (
            <div className="flex justify-center py-6">
              <p className="text-xs text-muted-foreground animate-pulse">{AGENT_NAME} is speaking…</p>
            </div>
          )}

          {/* Live messages */}
          {isLive &&
            isConnected &&
            liveMessages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "model" && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                    <span className="text-white text-[10px] font-bold">A</span>
                  </div>
                )}
                <Card
                  className={cn(
                    "max-w-[75%] border-none shadow-sm",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  <CardContent className="p-3">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.timestamp && (
                      <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {formatMsgTime(msg.timestamp)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating mic — idle / error */}
        {isLive && !isConnected && sessionState !== "fetching-context" && sessionState !== "connecting" && (
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span
                className="absolute h-20 w-20 rounded-full bg-primary/20"
                style={{ animation: "breathe 2.8s ease-in-out infinite" }}
              />
              <span
                className="absolute h-28 w-28 rounded-full bg-primary/10"
                style={{ animation: "breathe 2.8s ease-in-out infinite 0.4s" }}
              />
              <button
                onClick={startSession}
                disabled={historyLoading}
                className="relative z-10 h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-wait hover:scale-105 disabled:hover:scale-100"
              >
                {historyLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-7 w-7" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground drop-shadow-sm">
              {historyLoading ? "Loading..." : (todaySession ? "Tap to add to today's conversation" : `Tap to speak with ${AGENT_NAME}`)}
            </p>
          </div>
        )}

        {/* Active mic indicator — connected */}
        {isLive && isConnected && (
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span
                className="absolute h-20 w-20 rounded-full bg-destructive/25 animate-ping"
                style={{ animationDuration: "1.5s" }}
              />
              <button
                onClick={endSession}
                className="relative z-10 h-16 w-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Tap to end — {AGENT_NAME} is listening</p>
          </div>
        )}

        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.18); opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default VoiceCompanion;

