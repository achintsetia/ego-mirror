import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useHomeData, moodEmoji } from "@/hooks/useHomeData";
import {
  Sparkles,
  Activity,
  Clock,
  Lightbulb,
  Target,
  Mic,
  Brain,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { FirstLoginModal } from "@/components/FirstLoginModal";
import { useAuth } from "@/contexts/AuthContext";

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Home = () => {
  const { user, isFirstLogin } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const [modalOpen, setModalOpen] = useState(isFirstLogin);
  const { today, week, goals, goodHabits, badHabits } = useHomeData();

  const hasData = today.mood !== null;
  const productivityPct = today.productivityScore ? today.productivityScore * 10 : 0;

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">
      <FirstLoginModal open={modalOpen} onClose={handleModalClose} />
      {/* Hero Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-lavender-light to-mint-light p-6 md:p-8">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-lavender/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-mint/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-muted-foreground font-medium">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-1">
            {greetingByHour()}, {firstName} <span className="inline-block animate-pulse-soft">✨</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
          {today.mood
              ? <>Last time you felt <span className="font-medium capitalize">{today.mood}</span> — here's a snapshot of how you're showing up and growing.</>
              : "Start your first conversation with Avyaa to begin tracking your journey."}
          </p>
        </div>
      </div>

      {/* Today's Snapshot - Mood / Productivity / Energy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-lavender" /> Mood
            </CardDescription>
          </CardHeader>
          <CardContent>
          {hasData ? (
              <div className="flex items-center gap-3">
                <span className="text-5xl drop-shadow-sm">{moodEmoji[today.mood!]}</span>
                <div>
                  <p className="text-xl font-display font-bold capitalize">{today.mood}</p>
                  <p className="text-xs text-muted-foreground">Overall feeling last session</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet — chat with Avyaa to get started</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Activity className="h-4 w-4 text-primary" /> Productivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {today.productivityScore !== null ? (
              <div className="space-y-2">
                <p className="text-3xl font-display font-bold">
                  {today.productivityScore}
                  <span className="text-lg text-muted-foreground">/10</span>
                </p>
                <Progress value={productivityPct} className="h-2" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Clock className="h-4 w-4 text-peach" /> Hours Focused
            </CardDescription>
          </CardHeader>
          <CardContent>
            {today.productiveHours !== null ? (
              <>
                <p className="text-3xl font-display font-bold">
                  {today.productiveHours}
                  <span className="text-lg text-muted-foreground"> hrs</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Productive time today</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Key Moments + Mood Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Key Moments */}
        <Card className="border-none shadow-sm bg-lavender-light lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="text-lavender">✨</span> Key Moments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {today.keyMoments.length > 0 ? (
              <ul className="space-y-2">
                {today.keyMoments.map((moment, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-lavender/20 flex items-center justify-center text-[10px] font-bold text-lavender shrink-0">
                      {i + 1}
                    </span>
                    {moment}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Key moments from your conversations will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mood Trend Mini Chart */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Mood This Week</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-24">
              {week.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No mood data yet</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={week}>
                  <defs>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(260, 40%, 65%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(260, 40%, 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0 0% 100%)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) =>
                      ["great", "good", "okay", "low", "rough"][5 - value] || value
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(260, 40%, 65%)"
                    strokeWidth={2}
                    fill="url(#moodGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habits Overview + Personality Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Habits Overview */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Good Habits
              </CardTitle>
            </div>
            <CardDescription>
              {goodHabits.length > 0 ? `${goodHabits.length} habit${goodHabits.length === 1 ? "" : "s"} you're building` : "Track your positive habits"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goodHabits.length > 0 ? (
              <ul className="space-y-2">
                {goodHabits.map((habit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-mint shrink-0" />
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Your good habits will appear here after chatting with Avyaa.</p>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Brain className="h-4 w-4 text-lavender" /> Your Goals
              </CardTitle>
            </div>
            <CardDescription>What you're working towards</CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <ul className="space-y-2">
                {goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Target className="h-4 w-4 text-lavender shrink-0 mt-0.5" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Your goals will appear here after chatting with Avyaa.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <Link to="/voice">
            <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Voice Check-in</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Talk to your AI companion
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/reports">
            <Card className="border-none shadow-sm bg-gradient-to-br from-mint/5 to-mint/10 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-mint/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-mint" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Weekly Report</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    See your insights & trends
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* AI Insights */}
        <Card className="border-none shadow-sm bg-mint-light lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-mint" /> AI Insight
            </CardTitle>
            <CardDescription>Based on your last conversation</CardDescription>
          </CardHeader>
          <CardContent>
            {today.insights ? (
              <p className="text-sm text-foreground/80 leading-relaxed">{today.insights}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Personalized insights will appear after your first conversation with Avyaa.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Activities + Streak Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Today's Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData && today.focusAreas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {today.focusAreas.map((area, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm font-normal bg-muted/60"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Your focus areas will appear here after your first conversation.</p>
            )}
          </CardContent>
        </Card>

        {/* Bad Habits */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-peach-light to-peach-light/50">
          <CardContent className="p-6 h-full">
            {badHabits.length > 0 ? (
              <>
                <p className="text-sm font-display font-bold mb-3">Working on quitting</p>
                <ul className="space-y-1.5">
                  {badHabits.slice(0, 3).map((habit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                      <ArrowRight className="h-3.5 w-3.5 text-peach shrink-0" />
                      <span>{habit}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full gap-2">
                <p className="text-2xl">🌿</p>
                <p className="text-sm text-muted-foreground">Bad habits you want to address will show up here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
