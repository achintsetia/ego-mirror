import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { personalityTraits } from "@/data/mockData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

const timeRanges = ["1W", "1M", "3M"] as const;

const PersonalityEvolution = () => {
  const [range, setRange] = useState<typeof timeRanges[number]>("1M");

  const sliceData = (data: { date: string; value: number }[]) => {
    if (range === "1W") return data.slice(-7);
    if (range === "1M") return data;
    return data; // 3M would need more data, showing all for mock
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-mint" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-peach" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Personality Evolution</h1>
          <p className="text-muted-foreground mt-1">Watch your identity transform over time</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {timeRanges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Identity Shift Card */}
      <Card className="border-none shadow-sm bg-mint-light">
        <CardContent className="p-6">
          <p className="font-display font-bold text-lg mb-1">🪞 Identity Shift</p>
          <p className="text-sm text-foreground/80">
            Your discipline improved 18% over the last 2 weeks. You're building the habits of someone who shows up consistently — and the data proves it.
          </p>
        </CardContent>
      </Card>

      {/* Trait Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personalityTraits.map((trait) => (
          <Card key={trait.name} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center justify-between">
                <span>{trait.name}</span>
                <div className="flex items-center gap-2">
                  <TrendIcon trend={trait.trend} />
                  <Badge
                    variant="secondary"
                    className={`text-xs ${trait.change >= 0 ? "text-mint" : "text-peach"}`}
                  >
                    {trait.change >= 0 ? "+" : ""}{trait.change}%
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold mb-3">
                {trait.currentScore}<span className="text-sm text-muted-foreground">/100</span>
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sliceData(trait.data)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={trait.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PersonalityEvolution;
