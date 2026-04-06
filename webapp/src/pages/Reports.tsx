import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { weeklyReport, monthlyReport, type WeeklyReport } from "@/data/mockData";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Brain, Target, Smile } from "lucide-react";

function ReportView({ report }: { report: WeeklyReport }) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg Mood", value: report.avgMood.toFixed(1), icon: Smile, color: "text-lavender" },
          { label: "Avg Productivity", value: report.avgProductivity.toFixed(1), icon: TrendingUp, color: "text-primary" },
          { label: "Habits Done", value: `${report.habitsCompleted}/${report.totalHabits}`, icon: Target, color: "text-mint" },
          { label: "Completion", value: `${Math.round((report.habitsCompleted / report.totalHabits) * 100)}%`, icon: Brain, color: "text-peach" },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mood Trend */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Mood Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.moodTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--lavender))" strokeWidth={2} dot={{ fill: "hsl(var(--lavender))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Habit Breakdown */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Habit Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.habitBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="border-none shadow-sm bg-lavender-light">
        <CardHeader>
          <CardTitle className="text-base font-display">🔍 Top Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/80 leading-relaxed">{report.topInsight}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-mint-light">
        <CardHeader>
          <CardTitle className="text-base font-display">🧬 Personality Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/80 leading-relaxed">{report.personalityChanges}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const Reports = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Your behavioral patterns, summarized</p>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList className="bg-muted">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly" className="mt-4">
          <ReportView report={weeklyReport} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <ReportView report={monthlyReport} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
