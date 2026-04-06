import { subDays, format } from "date-fns";

const today = new Date();

// ── Mood / Productivity / Energy ──
export type MoodType = "great" | "good" | "okay" | "low" | "rough";
export const moodEmoji: Record<MoodType, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  low: "😔",
  rough: "😣",
};

export interface DailyEntry {
  date: string;
  mood: MoodType;
  productivity: number; // 1-10
  energy: "high" | "medium" | "low";
  activities: string[];
  reflection: string;
  suggestions: string[];
}

const activities = [
  "Morning meditation", "Deep work session", "Team standup", "Exercise",
  "Reading", "Lunch break", "Client meeting", "Code review",
  "Walk outside", "Journaling", "Creative brainstorm", "Evening yoga",
];

const reflections = [
  "You showed remarkable focus today — your deep work stretched unbroken for 90 minutes, a pattern that's becoming more consistent.",
  "Your energy dipped after meetings but you bounced back with a walk. This recovery pattern shows growing self-awareness.",
  "You prioritized rest when you felt overwhelmed instead of pushing through. That's a sign of emotional maturity.",
  "Your morning routine is anchoring your day — the data shows higher productivity on days you meditate first.",
  "You avoided distractions during your creative block today. That patience with yourself is paying off.",
  "Interesting pattern: you're most productive between 9-11am. Protecting that window could amplify your output.",
  "You checked in with yourself three times today. That micro-awareness habit is becoming second nature.",
];

const suggestionPool = [
  "Try a 5-minute breathing exercise before your next meeting",
  "Your focus peaks in the morning — schedule deep work before 11am",
  "Consider a 10-minute walk after lunch to reset your energy",
  "You've been consistent with meditation — try extending to 15 minutes",
  "Your sleep pattern suggests an earlier bedtime could help",
  "Take a screen break every 45 minutes during deep work",
  "Journal about what made today's good moments possible",
  "Celebrate your 7-day meditation streak!",
];

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const moods: MoodType[] = ["good", "great", "okay", "good", "great", "good", "okay", "low", "good", "great",
  "okay", "good", "great", "good", "good", "okay", "great", "good", "low", "good",
  "great", "good", "okay", "good", "great", "good", "good", "great", "good", "okay"];

export const dailyEntries: DailyEntry[] = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(today, 29 - i), "yyyy-MM-dd"),
  mood: moods[i],
  productivity: Math.min(10, Math.max(1, 5 + Math.round(Math.sin(i * 0.5) * 2.5 + (i / 30) * 2))),
  energy: (["low", "medium", "high"] as const)[Math.min(2, Math.floor(Math.random() * 3 + (i > 20 ? 0.5 : 0)))],
  activities: pick(activities, 3 + Math.floor(Math.random() * 3)),
  reflection: reflections[i % reflections.length],
  suggestions: pick(suggestionPool, 3),
}));

export const todayEntry = dailyEntries[dailyEntries.length - 1];

// ── Habits ──
export interface HabitDayData {
  date: string;
  hours: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  completedToday: boolean;
  dailyData: HabitDayData[]; // last 30 days
  color: string;
}

function generateHabitDays(baseHours: number, variance: number, completionRate: number): HabitDayData[] {
  return Array.from({ length: 30 }, (_, i) => {
    const completed = Math.random() < completionRate;
    return {
      date: format(subDays(today, 29 - i), "yyyy-MM-dd"),
      hours: completed ? Math.max(0.1, +(baseHours + (Math.random() - 0.5) * variance).toFixed(1)) : 0,
      completed,
    };
  });
}

export const habits: Habit[] = [
  { id: "meditation", name: "Meditation", icon: "🧘", streak: 12, completedToday: true,
    dailyData: generateHabitDays(0.5, 0.3, 0.85), color: "mint" },
  { id: "reading", name: "Reading", icon: "📚", streak: 5, completedToday: true,
    dailyData: generateHabitDays(1.0, 0.5, 0.7), color: "lavender" },
  { id: "exercise", name: "Exercise", icon: "🏃", streak: 3, completedToday: false,
    dailyData: generateHabitDays(1.2, 0.6, 0.6), color: "peach" },
  { id: "deep-work", name: "Deep Work", icon: "💻", streak: 8, completedToday: true,
    dailyData: generateHabitDays(3.0, 1.5, 0.8), color: "sky" },
  { id: "diet", name: "Healthy Diet", icon: "🥗", streak: 2, completedToday: true,
    dailyData: generateHabitDays(0.5, 0.2, 0.55), color: "mint" },
  { id: "sleep", name: "8h Sleep", icon: "😴", streak: 4, completedToday: true,
    dailyData: generateHabitDays(8.0, 0.5, 0.75), color: "lavender" },
];

export const habitCompletionRate = Math.round(
  (habits.filter(h => h.completedToday).length / habits.length) * 100
);

// ── Personality Traits ──
export interface TraitDataPoint { date: string; value: number }
export interface PersonalityTrait {
  name: string;
  currentScore: number;
  change: number; // percentage
  trend: "up" | "down" | "stable";
  data: TraitDataPoint[];
  color: string;
}

function generateTraitData(base: number, growth: number): TraitDataPoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(today, 29 - i), "MMM dd"),
    value: Math.min(100, Math.max(0, base + (growth * i / 30) + (Math.random() - 0.5) * 8)),
  }));
}

export const personalityTraits: PersonalityTrait[] = [
  { name: "Discipline", currentScore: 72, change: 18, trend: "up",
    data: generateTraitData(55, 20), color: "hsl(220, 60%, 55%)" },
  { name: "Focus", currentScore: 68, change: 12, trend: "up",
    data: generateTraitData(58, 12), color: "hsl(160, 40%, 55%)" },
  { name: "Consistency", currentScore: 65, change: 8, trend: "up",
    data: generateTraitData(58, 10), color: "hsl(260, 40%, 65%)" },
  { name: "Emotional Stability", currentScore: 74, change: -3, trend: "down",
    data: generateTraitData(75, -3), color: "hsl(20, 80%, 70%)" },
];

// ── Conversation Mock ──
export interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

export const mockConversation: ChatMessage[] = [
  { id: "1", sender: "ai", text: "Good evening! How was your day today? 🌙", timestamp: "8:30 PM" },
  { id: "2", sender: "user", text: "It was pretty productive actually. Had a long deep work session in the morning.", timestamp: "8:31 PM" },
  { id: "3", sender: "ai", text: "That's wonderful to hear! Your morning deep work sessions have been getting longer — you averaged 72 minutes this week compared to 55 last week. What did you work on?", timestamp: "8:31 PM" },
  { id: "4", sender: "user", text: "I was building the new feature module. Got into a real flow state for a while.", timestamp: "8:32 PM" },
  { id: "5", sender: "ai", text: "Flow states are your superpower! I've noticed you enter them more easily on days when you meditate first. Did you meditate today?", timestamp: "8:32 PM" },
  { id: "6", sender: "user", text: "Yes! 10 minutes this morning. I think it really does help.", timestamp: "8:33 PM" },
  { id: "7", sender: "ai", text: "That's your 12-day meditation streak! 🎉 The correlation is clear in your data. How about your energy levels — did you feel a dip at any point?", timestamp: "8:33 PM" },
  { id: "8", sender: "user", text: "Yeah, after the 2pm meeting I felt drained. Took a walk and felt better though.", timestamp: "8:34 PM" },
  { id: "9", sender: "ai", text: "Smart recovery strategy. Walking after energy dips has become a reliable pattern for you. I'm adding this to today's reflection. One suggestion: try a 2-minute breathing exercise before tomorrow's meetings — it might help prevent the post-meeting crash. 💫", timestamp: "8:35 PM" },
];

// ── Weekly/Monthly Report ──
export interface WeeklyReport {
  period: string;
  avgMood: number;
  avgProductivity: number;
  habitsCompleted: number;
  totalHabits: number;
  topInsight: string;
  personalityChanges: string;
  moodTrend: { day: string; value: number }[];
  habitBreakdown: { name: string; rate: number }[];
}

export const weeklyReport: WeeklyReport = {
  period: "This Week",
  avgMood: 7.2,
  avgProductivity: 7.5,
  habitsCompleted: 28,
  totalHabits: 42,
  topInsight: "Your best days correlate strongly with morning meditation and exercise before noon. Days without exercise showed a 30% drop in afternoon productivity.",
  personalityChanges: "Discipline score rose 4 points. Focus remains stable. Consistency improving with fewer habit-skip days.",
  moodTrend: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    value: [7, 8, 6, 7, 9, 8, 7][i],
  })),
  habitBreakdown: habits.map(h => ({
    name: h.name,
    rate: Math.round((h.dailyData.slice(-7).filter(d => d.completed).length / 7) * 100),
  })),
};

export const monthlyReport: WeeklyReport = {
  period: "This Month",
  avgMood: 6.8,
  avgProductivity: 7.1,
  habitsCompleted: 108,
  totalHabits: 180,
  topInsight: "Your personality evolution shows a clear upward trend in discipline (+18%) and focus (+12%). The biggest driver is your consistent morning routine — you've maintained it 85% of days this month.",
  personalityChanges: "Identity shift detected: You're transitioning from 'reactive worker' to 'intentional creator'. Your deep work blocks are 40% longer than last month.",
  moodTrend: ["W1", "W2", "W3", "W4"].map((w, i) => ({
    day: w,
    value: [6.5, 7.0, 6.8, 7.2][i],
  })),
  habitBreakdown: habits.map(h => ({
    name: h.name,
    rate: Math.round(50 + Math.random() * 40),
  })),
};
