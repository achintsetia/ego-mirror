import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { todayEntry, moodEmoji } from "@/data/mockData";
import { Lightbulb, Activity, Zap, Sparkles } from "lucide-react";

const energyColor = {
  high: "bg-mint text-mint-light",
  medium: "bg-sky text-sky-light",
  low: "bg-peach text-peach-light",
};

const Index = () => {
  const productivityPct = todayEntry.productivity * 10;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Good evening, Jane ✨
        </h1>
        <p className="text-muted-foreground mt-1">Here's your mirror for today</p>
      </div>

      {/* Today's Mirror */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lavender" /> Mood
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{moodEmoji[todayEntry.mood]}</span>
              <div>
                <p className="text-xl font-display font-bold capitalize">{todayEntry.mood}</p>
                <p className="text-xs text-muted-foreground">Overall feeling today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Productivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-display font-bold">{todayEntry.productivity}<span className="text-lg text-muted-foreground">/10</span></p>
              <Progress value={productivityPct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-peach" /> Energy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={`${energyColor[todayEntry.energy]} text-sm px-3 py-1 capitalize border-none`}>
              {todayEntry.energy}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Energy level right now</p>
          </CardContent>
        </Card>
      </div>

      {/* Truth Reflection */}
      <Card className="border-none shadow-sm bg-lavender-light">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <span className="text-lavender">💡</span> Today's Truth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/80 leading-relaxed italic">
            "{todayEntry.reflection}"
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Activities */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Key Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {todayEntry.activities.map((activity, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  {activity}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card className="border-none shadow-sm bg-mint-light">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-mint" /> AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {todayEntry.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="mt-0.5 text-mint font-bold">{i + 1}.</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
