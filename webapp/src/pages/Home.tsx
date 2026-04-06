import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  todayEntry,
  moodEmoji,
  habits,
  habitCompletionRate,
  personalityTraits,
  dailyEntries,
  type MoodType,
} from "@/data/mockData";
import {
  Sparkles,
  Activity,
  Zap,
  Lightbulb,
  Target,
  Mic,
  Brain,
  BarChart3,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { FirstLoginModal } from "@/components/FirstLoginModal";
import { useAuth } from "@/contexts/AuthContext";

const energyColor = {
  high: "bg-mint text-mint-light",
  medium: "bg-sky text-sky-light",
  low: "bg-peach text-peach-light",
};

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const moodToValue: Record<MoodType, number> = {
  great: 5,
  good: 4,
  okay: 3,
  low: 2,
  rough: 1,
};

const moodChartData = dailyEntries.slice(-7).map((e) => ({
  day: format(new Date(e.date), "EEE"),
  mood: moodToValue[e.mood],
  productivity: e.productivity,
}));

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-mint" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-peach" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const Home = () => {
  const productivityPct = todayEntry.productivity * 10;
  const topStreak = [...habits].sort((a, b) => b.streak - a.streak)[0];
  const { user, isFirstLogin, markOnboardingDone } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const [modalOpen, setModalOpen] = useState(isFirstLogin);

  const handleModalClose = async () => {
    setModalOpen(false);
    await markOnboardingDone();
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
            Last time you felt <span className="font-medium capitalize">{todayEntry.mood}</span> — here's a snapshot of how you're showing up and growing.
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
            <div className="flex items-center gap-3">
              <span className="text-5xl drop-shadow-sm">{moodEmoji[todayEntry.mood]}</span>
              <div>
                <p className="text-xl font-display font-bold capitalize">{todayEntry.mood}</p>
                <p className="text-xs text-muted-foreground">Overall feeling today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Activity className="h-4 w-4 text-primary" /> Productivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-display font-bold">
                {todayEntry.productivity}
                <span className="text-lg text-muted-foreground">/10</span>
              </p>
              <Progress value={productivityPct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Zap className="h-4 w-4 text-peach" /> Energy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              className={`${energyColor[todayEntry.energy]} text-sm px-3 py-1 capitalize border-none`}
            >
              {todayEntry.energy}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Energy level right now</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Truth + Mood Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Truth Reflection */}
        <Card className="border-none shadow-sm bg-lavender-light lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="text-lavender">💡</span> Today's Truth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80 leading-relaxed italic text-sm">
              "{todayEntry.reflection}"
            </p>
          </CardContent>
        </Card>

        {/* Mood Trend Mini Chart */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Mood This Week</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodChartData}>
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
                <Target className="h-4 w-4 text-primary" /> Habits Today
              </CardTitle>
              <Link
                to="/habits"
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>
              {habits.filter((h) => h.completedToday).length} of {habits.length} completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Completion ring + habits list */}
            <div className="flex items-start gap-5">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${habitCompletionRate}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold font-display">
                  {habitCompletionRate}%
                </span>
              </div>
              <ul className="flex-1 space-y-2">
                {habits.map((habit) => (
                  <li key={habit.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{habit.icon}</span>
                      <span className={habit.completedToday ? "" : "text-muted-foreground"}>
                        {habit.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {habit.streak > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Flame className="h-3 w-3 text-peach" />
                          {habit.streak}
                        </span>
                      )}
                      {habit.completedToday ? (
                        <CheckCircle2 className="h-4 w-4 text-mint" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Personality Snapshot */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Brain className="h-4 w-4 text-lavender" /> Personality Evolution
              </CardTitle>
              <Link
                to="/personality"
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                Deep dive <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>How your traits are shifting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalityTraits.map((trait) => (
                <div key={trait.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{trait.name}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <TrendIcon trend={trait.trend} />
                      <span
                        className={
                          trait.change > 0
                            ? "text-mint"
                            : trait.change < 0
                              ? "text-peach"
                              : "text-muted-foreground"
                        }
                      >
                        {trait.change > 0 ? "+" : ""}
                        {trait.change}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${trait.currentScore}%`,
                        backgroundColor: trait.color,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-right">
                    {trait.currentScore}/100
                  </p>
                </div>
              ))}
            </div>
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

        {/* AI Suggestions */}
        <Card className="border-none shadow-sm bg-mint-light lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-mint" /> AI Suggestions
            </CardTitle>
            <CardDescription>Personalized nudges based on your patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {todayEntry.suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-foreground/80"
                >
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-mint/20 flex items-center justify-center text-xs font-bold text-mint shrink-0">
                    {i + 1}
                  </span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Key Activities + Streak Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Today's Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {todayEntry.activities.map((activity, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-normal bg-muted/60"
                >
                  {activity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Streak */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-peach-light to-peach-light/50">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
            <div className="text-4xl mb-2">{topStreak.icon}</div>
            <p className="font-display font-bold text-2xl flex items-center gap-1">
              <Flame className="h-5 w-5 text-peach" />
              {topStreak.streak} days
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {topStreak.name} streak — keep going!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
