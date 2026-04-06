import { useAuth } from "@/contexts/AuthContext";
import {
  Target,
  Mic,
  Brain,
  BarChart3,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "Habit Tracker",
    description:
      "Build the identity you want, one day at a time. Track streaks, visualize consistency, and watch your habits compound.",
    color: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Mic,
    title: "Voice Companion",
    description:
      "An AI companion that listens, reflects, and helps you process your day through natural conversation.",
    color: "from-lavender/10 to-lavender/5",
    iconBg: "bg-lavender/10",
    iconColor: "text-lavender",
  },
  {
    icon: Brain,
    title: "Personality Evolution",
    description:
      "Watch your identity transform over time. Track discipline, focus, consistency, and emotional stability.",
    color: "from-mint/10 to-mint/5",
    iconBg: "bg-mint/10",
    iconColor: "text-mint",
  },
  {
    icon: BarChart3,
    title: "Insightful Reports",
    description:
      "Weekly and monthly breakdowns of your patterns, correlations, and growth — powered by your own data.",
    color: "from-peach/10 to-peach/5",
    iconBg: "bg-peach/10",
    iconColor: "text-peach",
  },
];

const highlights = [
  {
    icon: Sparkles,
    title: "AI-Powered Reflections",
    description: "Get personalized insights based on patterns only data can reveal.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Your data stays yours. End-to-end encrypted and never shared.",
  },
  {
    icon: Zap,
    title: "Takes 2 Minutes",
    description: "Quick daily check-ins that build a powerful picture over time.",
  },
];

const testimonials = [
  {
    quote: "I finally understand why some days feel off and others feel unstoppable. The patterns are real.",
    name: "Morning Routine Builder",
    streak: "45-day streak",
  },
  {
    quote: "Talking to the AI companion at night became my favorite ritual. It's like journaling but better.",
    name: "Evening Reflector",
    streak: "30-day streak",
  },
  {
    quote: "Watching my discipline score climb from 45 to 72 in a month was the motivation I needed.",
    name: "Identity Shifter",
    streak: "60-day streak",
  },
];

export default function Landing() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lp-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="lp-shine" x1="0.2" y1="0" x2="0.8" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="url(#lp-bg)" />
              <ellipse cx="16" cy="12" rx="8" ry="9.5" fill="url(#lp-shine)" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
              <rect x="14.75" y="21" width="2.5" height="6" rx="1.25" fill="white" fillOpacity="0.7" />
              <path d="M16 7 L16.8 11 L21 12 L16.8 13 L16 17 L15.2 13 L11 12 L15.2 11 Z" fill="white" fillOpacity="0.92" />
            </svg>
            <span className="font-display font-bold text-xl text-foreground">Ego-Mirror</span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-lavender/15 blur-3xl" />
          <div className="absolute top-40 right-1/4 h-64 w-64 rounded-full bg-mint/15 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-lavender" />
            Your AI-powered self-awareness companion
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-foreground leading-tight">
            See yourself clearly.
            <br />
            <span className="bg-gradient-to-r from-primary via-lavender to-mint bg-clip-text text-transparent">
              Grow intentionally.
            </span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Ego-Mirror tracks your habits, mood, and personality evolution — then reflects back
            the patterns you can't see yourself. It's not a to-do app. It's a mirror.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-3 rounded-xl bg-foreground text-background px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-foreground/10"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <span className="text-sm text-muted-foreground">Free forever. No credit card.</span>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-mint" />
            <span><strong className="text-foreground">2-min</strong> daily check-ins</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-lavender" />
            <span><strong className="text-foreground">AI</strong> voice reflections</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span><strong className="text-foreground">Personality</strong> evolution tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-peach" />
            <span><strong className="text-foreground">100%</strong> private</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Everything you need to know yourself better
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Four pillars that work together to give you the clearest picture of who you are and who you're becoming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card
              key={f.title}
              className={`border-none shadow-sm bg-gradient-to-br ${f.color} hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-6 md:p-8">
                <div className={`h-12 w-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">Three simple steps. Two minutes a day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Check in daily",
                description: "Log your mood, energy, and activities in under 2 minutes — or just talk to your AI companion.",
              },
              {
                step: "02",
                title: "See your patterns",
                description: "Ego-Mirror finds correlations you'd never notice — like how meditation predicts afternoon focus.",
              },
              {
                step: "03",
                title: "Evolve your identity",
                description: "Watch your personality traits shift over weeks. Become the person your habits are building.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-lavender text-white font-display font-bold text-sm mb-4">
                  {s.step}
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((h) => (
            <div key={h.title} className="text-center p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-lavender/10 mb-4">
                <h.icon className="h-5 w-5 text-lavender" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">{h.title}</h3>
              <p className="text-sm text-muted-foreground">{h.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 border-y">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
            People are seeing themselves differently
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-none shadow-sm bg-card">
                <CardContent className="p-6">
                  <p className="text-foreground/80 text-sm italic leading-relaxed mb-4">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{t.name}</span>
                    <span className="text-mint font-medium">{t.streak}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-1/3 h-48 w-48 rounded-full bg-lavender/15 blur-3xl" />
          <div className="absolute bottom-10 right-1/3 h-40 w-40 rounded-full bg-mint/15 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Ready to meet the real you?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Start your journey of self-awareness today. It takes less than a minute to begin.
          </p>
          <button
            onClick={signInWithGoogle}
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-foreground text-background px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-foreground/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ft-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="url(#ft-bg)" />
              <path d="M16 7 L16.8 11 L21 12 L16.8 13 L16 17 L15.2 13 L11 12 L15.2 11 Z" fill="white" fillOpacity="0.92" />
            </svg>
            <span>Ego-Mirror</span>
          </div>
          <p>Built for humans who want to grow.</p>
        </div>
      </footer>
    </div>
  );
}
