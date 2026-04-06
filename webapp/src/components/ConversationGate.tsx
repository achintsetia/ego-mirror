import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mic } from "lucide-react";

export function ConversationGate({ children }: { children: ReactNode }) {
  const { hasConversation } = useAuth();

  if (hasConversation) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-6 max-w-md mx-auto">
      <div className="relative flex items-center justify-center">
        <span
          className="absolute rounded-full bg-primary/20"
          style={{ width: 80, height: 80, animation: "breathe 2.8s ease-in-out infinite" }}
        />
        <span
          className="absolute rounded-full bg-primary/10"
          style={{ width: 104, height: 104, animation: "breathe 2.8s ease-in-out infinite 0.4s" }}
        />
        <div className="relative z-10 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-xl">
          <Mic className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-display font-bold text-foreground">Start with Avyaa first</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page unlocks after your first conversation. Head over to Avyaa, say hello, and your personal insights will start appearing here.
        </p>
      </div>

      <Link
        to="/voice"
        className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium px-6 py-2.5 hover:bg-primary/90 transition-colors shadow-md"
      >
        <Mic className="h-4 w-4" />
        Talk to Avyaa
      </Link>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.18); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
