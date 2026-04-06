import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHabitData, type ChartRange, type ChartPoint } from "@/hooks/useHabitData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Moon,
  Dumbbell,
  Utensils,
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
} from "lucide-react";

const sleepQualityColor: Record<string, string> = {
  excellent: "bg-mint text-mint-light",
  good: "bg-mint/70 text-mint-light",
  okay: "bg-sky text-sky-light",
  poor: "bg-peach/70 text-peach-light",
  terrible: "bg-peach text-peach-light",
};

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "3m", label: "3M" },
];

function MiniChart({
  data,
  color,
  loading,
  unit,
  emptyText,
  domain,
  yWidth = 44,
}: {
  data: ChartPoint[];
  color: string;
  loading: boolean;
  unit: string;
  emptyText: string;
  domain?: [number, number];
  yWidth?: number;
}) {
  if (loading) return <div className="h-36 bg-muted/40 rounded-lg animate-pulse" />;
  if (!data.length)
    return <p className="text-xs text-muted-foreground py-6 text-center">{emptyText}</p>;

  const chartData = data.map((p) => ({ label: p.label, value: p.value ?? 0 }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={yWidth}
          tickFormatter={(v: number) => `${v}${unit.startsWith("/") ? unit : " " + unit}`}
          tickCount={4}
          domain={domain}
        />
        <RechartsTooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: number) => [`${v} ${unit}`, ""]}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const HabitTracker = () => {
  const [range, setRange] = useState<ChartRange>("7d");
  const {
    loading,
    chartLoading,
    goodHabits,
    badHabits,
    goals,
    latestFood,
    latestExercise,
    latestSleep,
    sleepChart,
    exerciseChart,
    caloriesChart,
    productivityChart,
  } = useHabitData(range);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Habit Tracker</h1>
        <p className="text-muted-foreground mt-1">Build the identity you want, one day at a time</p>
      </div>

      {/* Trends — Charts with range selector */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
            Trends
          </h2>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md font-medium transition-colors",
                  range === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Moon className="h-4 w-4 text-lavender" /> Sleep Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MiniChart
                data={sleepChart}
                color="hsl(var(--lavender))"
                loading={chartLoading}
                unit="hrs"
                emptyText="No sleep data yet — tell Avyaa how you slept."
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-mint" /> Exercise Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MiniChart
                data={exerciseChart}
                color="hsl(var(--mint))"
                loading={chartLoading}
                unit="min"
                emptyText="No exercise data yet — tell Avyaa about your workouts."
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky" /> Productivity Score
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MiniChart
                data={productivityChart}
                color="hsl(var(--sky))"
                loading={chartLoading}
                unit="/10"
                domain={[0, 10]}
                emptyText="No productivity data yet — tell Avyaa about your day."
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Flame className="h-4 w-4 text-peach" /> Calorie Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <MiniChart
                data={caloriesChart}
                color="hsl(var(--peach))"
                loading={chartLoading}
                unit="kcal"
                yWidth={62}
                emptyText="No food data yet — tell Avyaa what you ate."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Latest Daily Stats — Sleep / Exercise / Food */}
      <section>
        <h2 className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Latest daily snapshot
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Sleep */}
          <Card className="border-none shadow-sm bg-lavender-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Moon className="h-4 w-4 text-lavender" /> Sleep
              </CardTitle>
              {latestSleep?.dateKey && (
                <CardDescription className="text-xs">{latestSleep.dateKey}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {latestSleep ? (
                <div className="space-y-2">
                  {latestSleep.hoursSlept !== null && (
                    <p className="text-3xl font-display font-bold">
                      {latestSleep.hoursSlept}
                      <span className="text-base text-muted-foreground"> hrs</span>
                    </p>
                  )}
                  {latestSleep.sleepQuality && (
                    <Badge className={`${sleepQualityColor[latestSleep.sleepQuality] ?? ""} border-none capitalize text-xs`}>
                      {latestSleep.sleepQuality}
                    </Badge>
                  )}
                  {latestSleep.bedtime && latestSleep.wakeTime && (
                    <p className="text-xs text-muted-foreground">
                      {latestSleep.bedtime} → {latestSleep.wakeTime}
                    </p>
                  )}
                  {latestSleep.observations.length > 0 && (
                    <ul className="space-y-1 mt-1">
                      {latestSleep.observations.map((obs, i) => (
                        <li key={i} className="text-xs text-foreground/70">· {obs}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sleep data yet — tell Avyaa how you slept.</p>
              )}
            </CardContent>
          </Card>

          {/* Exercise */}
          <Card className="border-none shadow-sm bg-mint-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-mint" /> Exercise
              </CardTitle>
              {latestExercise?.dateKey && (
                <CardDescription className="text-xs">{latestExercise.dateKey}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {latestExercise ? (
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold">
                    {latestExercise.totalDurationMinutes}
                    <span className="text-base text-muted-foreground"> min</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ~{latestExercise.totalCaloriesBurned} kcal burned
                  </p>
                  <ul className="space-y-1 mt-1">
                    {latestExercise.activities.map((a, i) => (
                      <li key={i} className="text-xs text-foreground/70">
                        · {a.name} — {a.durationMinutes} min
                      </li>
                    ))}
                  </ul>
                  {latestExercise.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{latestExercise.notes}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No exercise data yet — tell Avyaa about your workouts.</p>
              )}
            </CardContent>
          </Card>

          {/* Food */}
          <Card className="border-none shadow-sm bg-peach-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Utensils className="h-4 w-4 text-peach" /> Food
              </CardTitle>
              {latestFood?.dateKey && (
                <CardDescription className="text-xs">{latestFood.dateKey}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {latestFood ? (
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold">
                    {latestFood.totalCalories}
                    <span className="text-base text-muted-foreground"> kcal</span>
                  </p>
                  <ul className="space-y-1 mt-1">
                    {latestFood.meals.map((m, i) => (
                      <li key={i} className="text-xs text-foreground/70">
                        · {m.name}: {m.approximateCalories} kcal
                      </li>
                    ))}
                  </ul>
                  {latestFood.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{latestFood.notes}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No food data yet — tell Avyaa what you ate today.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Good Habits + Bad Habits + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Good Habits */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-mint" /> Good Habits
            </CardTitle>
            <CardDescription>Positive patterns you're building</CardDescription>
          </CardHeader>
          <CardContent>
            {goodHabits.length > 0 ? (
              <ul className="space-y-2">
                {goodHabits.map((habit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-mint shrink-0 mt-0.5" />
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Good habits you mention to Avyaa will appear here.</p>
            )}
          </CardContent>
        </Card>

        {/* Bad Habits */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-peach" /> Working on Quitting
            </CardTitle>
            <CardDescription>Habits you want to address</CardDescription>
          </CardHeader>
          <CardContent>
            {badHabits.length > 0 ? (
              <ul className="space-y-2">
                {badHabits.map((habit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-peach shrink-0 mt-0.5" />
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Bad habits you want to quit will appear here after chatting with Avyaa.</p>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-none shadow-sm bg-lavender-light">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Target className="h-4 w-4 text-lavender" /> Your Goals
            </CardTitle>
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
              <p className="text-sm text-muted-foreground">Goals you share with Avyaa will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HabitTracker;

