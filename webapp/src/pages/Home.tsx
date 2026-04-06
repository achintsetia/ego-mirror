import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useHomeData, moodEmoji, TodoItem } from "@/hooks/useHomeData";
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
  Circle,
  ListTodo,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { subDays } from "date-fns";
import { FirstLoginModal } from "@/components/FirstLoginModal";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";

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
  const { today, week, goals, goodHabits, badHabits, todos } = useHomeData();
  const [localTodos, setLocalTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    setLocalTodos(todos);
  }, [todos]);

  const handleToggleTodo = async (id: string, currentStatus: string) => {
    if (!user?.email) return;
    const newStatus = currentStatus === "open" ? "closed" : "open";
    // Optimistic update
    setLocalTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus as "open" | "closed", closedAt: newStatus === "closed" ? new Date() : null } : t,
      ),
    );
    try {
      const todoRef = doc(db, "todo", user.email);
      const snap = await getDoc(todoRef);
      if (!snap.exists()) return;
      const items = snap.data().items ?? [];
      const updated = items.map((t: TodoItem) =>
        t.id === id
          ? { ...t, status: newStatus, closedAt: newStatus === "closed" ? new Date() : null }
          : t,
      );
      await updateDoc(todoRef, { items: updated });
    } catch (err) {
      console.error("handleToggleTodo failed", err);
      // Revert on error
      setLocalTodos(todos);
    }
  };

  const openTodos = localTodos.filter((t) => t.status === "open");
  const closedTodos = localTodos.filter((t) => t.status === "closed");

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
            {(() => {
              // Build a full 7-day skeleton (today going back 6 days)
              const dayLabels = Array.from({ length: 7 }, (_, i) =>
                format(subDays(new Date(), 6 - i), "EEE"),
              );
              const weekMap = Object.fromEntries(week.map((e) => [e.day, e.mood]));
              const chartData = dayLabels.map((day) => ({
                day,
                mood: weekMap[day] ?? null,
              }));
              const moodLabels: Record<number, string> = { 5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Rough" };
              return (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(260, 40%, 65%)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(260, 40%, 65%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(220, 10%, 90%)"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tickFormatter={(v: number) => moodLabels[v] ?? ""}
                        tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
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
                          [moodLabels[value] ?? value, "Mood"]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="mood"
                        stroke="hsl(260, 40%, 65%)"
                        strokeWidth={2}
                        fill="url(#moodGradient)"
                        connectNulls={false}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.mood === null) return <g key={payload.day} />;
                          return (
                            <circle
                              key={payload.day}
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill="hsl(260, 40%, 65%)"
                              stroke="white"
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
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

      {/* Todo List */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" /> To-Do
            </CardTitle>
            {localTodos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {openTodos.length} open · {closedTodos.length} done
              </span>
            )}
          </div>
          <CardDescription>Action items extracted from your conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {localTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your to-do items will appear here after chatting with Avyaa.</p>
          ) : (
            <ul className="space-y-2">
              {openTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-3 text-sm cursor-pointer group"
                  onClick={() => handleToggleTodo(todo.id, todo.status)}
                >
                  <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-foreground/90">{todo.text}</span>
                </li>
              ))}
              {closedTodos.length > 0 && openTodos.length > 0 && (
                <li className="pt-1">
                  <div className="border-t border-dashed border-muted-foreground/20" />
                </li>
              )}
              {closedTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-3 text-sm cursor-pointer group"
                  onClick={() => handleToggleTodo(todo.id, todo.status)}
                >
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-mint" />
                  <span className="text-muted-foreground line-through">{todo.text}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
