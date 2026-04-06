import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useVoiceSessionHistory, type VoiceSession } from "@/hooks/useVoiceSessionHistory";
import { Mic, MicOff, MessageCircle, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, parseISO } from "date-fns";

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

const VoiceCompanion = () => {
  const { sessions, loading } = useVoiceSessionHistory();
  const [selectedSession, setSelectedSession] = useState<VoiceSession | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const groupedSessions = groupSessionsByMonth(sessions);
  const activeMessages = selectedSession ? selectedSession.transcript : [];
  const activeTitle = selectedSession ? formatSessionDate(selectedSession.isoDate) : "Today";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleSelectSession = (session: VoiceSession) => {
    setSelectedSession(session);
    setIsLive(false);
  };

  const handleNewChat = () => {
    setSelectedSession(null);
    setIsLive(true);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden">
      {/* Conversation History Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-sidebar border-r border-border transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
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
          {loading && (
            <div className="space-y-2 px-2 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center px-4 pt-6 leading-relaxed">
              No past conversations yet. Start talking to Avyaa!
            </p>
          )}
          {!loading && Object.entries(groupedSessions).map(([month, monthSessions]) => (
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
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
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
              {isLive && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Avyaa</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isLive ? "Active now" : activeTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
          {isLive && activeMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <p className="text-sm font-medium text-foreground">Hi, I'm Avyaa</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Tap the mic below to start your daily reflection. I'll listen, remember, and help you grow.
              </p>
            </div>
          )}
          {activeMessages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "model" && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                  <span className="text-white text-[10px] font-bold">A</span>
                </div>
              )}
              <Card
                className={cn(
                  "max-w-[75%] border-none shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                )}
              >
                <CardContent className="p-3">
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.timestamp && (
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        msg.role === "user"
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      )}
                    >
                      {msg.timestamp}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Mic Button */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-6">
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              {/* Breathing ring layers */}
              <div className="relative flex items-center justify-center">
                {!isRecording && (
                  <>
                    <span
                      className="absolute rounded-full bg-primary/20"
                      style={{
                        width: 80,
                        height: 80,
                        animation: "breathe 2.8s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="absolute rounded-full bg-primary/10"
                      style={{
                        width: 100,
                        height: 100,
                        animation: "breathe 2.8s ease-in-out infinite 0.4s",
                      }}
                    />
                  </>
                )}
                {isRecording && (
                  <>
                    <span
                      className="absolute rounded-full bg-destructive/25"
                      style={{
                        width: 80,
                        height: 80,
                        animation: "pulse-ring 1.2s ease-out infinite",
                      }}
                    />
                    <span
                      className="absolute rounded-full bg-destructive/12"
                      style={{
                        width: 104,
                        height: 104,
                        animation: "pulse-ring 1.2s ease-out infinite 0.3s",
                      }}
                    />
                  </>
                )}
                <button
                  onClick={() => {
                    if (!isLive) handleNewChat();
                    else setIsRecording((v) => !v);
                  }}
                  className={cn(
                    "relative z-10 h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95",
                    isRecording
                      ? "bg-destructive text-destructive-foreground scale-110"
                      : "bg-primary text-primary-foreground hover:scale-105"
                  )}
                >
                  {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground drop-shadow-sm">
                {isRecording ? "Tap to stop" : isLive ? "Tap to speak with Avyaa" : "Tap to start a new conversation"}
              </p>
            </div>
          </div>

        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.18); opacity: 0.3; }
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>


      </div>
    </div>
  );
};

export default VoiceCompanion;

