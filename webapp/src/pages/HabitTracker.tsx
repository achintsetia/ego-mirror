import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { habits, habitCompletionRate } from "@/data/mockData";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type TimeRange = "7d" | "30d";

const colorMap: Record<string, { bg: string; fill: string; bar: string }> = {
  mint: { bg: "bg-mint-light", fill: "bg-mint", bar: "bg-mint" },
  lavender: { bg: "bg-lavender-light", fill: "bg-lavender", bar: "bg-lavender" },
  peach: { bg: "bg-peach-light", fill: "bg-peach", bar: "bg-peach" },
  sky: { bg: "bg-sky-light", fill: "bg-sky", bar: "bg-sky" },
};

const HabitTracker = () => {
  const [range, setRange] = useState<TimeRange>("7d");
  const days = range === "7d" ? 7 : 30;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Habit Tracker</h1>
          <p className="text-muted-foreground mt-1">Build the identity you want, one day at a time</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md font-medium transition-colors",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Completion Rate */}
      <Card className="border-none shadow-sm bg-lavender-light">
        <CardContent className="p-6 flex items-center gap-6">
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
                stroke="hsl(var(--lavender))"
                strokeWidth="3"
                strokeDasharray={`${habitCompletionRate}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold font-display">
              {habitCompletionRate}%
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-lg">Today's Completion</p>
            <p className="text-sm text-muted-foreground">
              {habits.filter(h => h.completedToday).length} of {habits.length} habits done
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Habit Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map((habit) => {
          const colors = colorMap[habit.color] || colorMap.mint;
          const visibleData = habit.dailyData.slice(-days);
          const maxHours = Math.max(...visibleData.map(d => d.hours), 1);

          return (
            <Card key={habit.id} className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{habit.icon}</span>
                    {habit.name}
                  </span>
                  {habit.completedToday ? (
                    <CheckCircle2 className="h-5 w-5 text-mint" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary" className="text-xs">
                  🔥 {habit.streak} day streak
                </Badge>

                {/* Hours bar chart */}
                <div className="flex items-end gap-[2px]">
                  {visibleData.map((day, i) => {
                    const height = day.hours > 0 ? Math.max(8, (day.hours / maxHours) * 48) : 4;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {day.hours > 0 ? `${day.hours}h` : "—"}
                        </div>
                        <div
                          className={cn(
                            "w-full rounded-sm transition-all",
                            day.hours > 0 ? colors.fill : "bg-muted"
                          )}
                          style={{ height: `${height}px` }}
                        />
                        {range === "7d" && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(parseISO(day.date), "EEE").charAt(0)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total hours for period */}
                <p className="text-xs text-muted-foreground">
                  {visibleData.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h total · {visibleData.filter(d => d.completed).length}/{days} days
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default HabitTracker;
