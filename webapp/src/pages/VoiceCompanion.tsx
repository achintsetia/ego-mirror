import { Card, CardContent } from "@/components/ui/card";
import { mockConversation } from "@/data/mockData";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const VoiceCompanion = () => {
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold">Voice Companion</h1>
        <p className="text-muted-foreground text-sm">Your daily reflection conversation</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto space-y-4 pb-24 pr-2">
        {mockConversation.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.sender === "user" ? "justify-end" : "justify-start"
            )}
          >
            <Card
              className={cn(
                "max-w-[80%] border-none shadow-sm",
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              )}
            >
              <CardContent className="p-3">
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1",
                    msg.sender === "user"
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  )}
                >
                  {msg.timestamp}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Floating Mic Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:relative md:bottom-0 flex justify-center pb-4">
        <button className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse-soft">
          <Mic className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};

export default VoiceCompanion;
