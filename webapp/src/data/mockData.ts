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

export const todayEntry: DailyEntry | null = null; // populated from Firestore once real session data is available

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

// ── Avyaa Conversation Sessions ──
export interface AvyaaSession {
  id: string;
  date: string; // yyyy-MM-dd
  preview: string;
  messages: ChatMessage[];
}

const sessionMessages: { preview: string; messages: ChatMessage[] }[] = [
  {
    preview: "Reflected on a productive deep work session and meditation streak.",
    messages: [
      { id: "1", sender: "ai", text: "Good evening! How was your day today? 🌙", timestamp: "8:30 PM" },
      { id: "2", sender: "user", text: "It was pretty productive actually. Had a long deep work session in the morning.", timestamp: "8:31 PM" },
      { id: "3", sender: "ai", text: "That's wonderful! Your morning deep work sessions are getting longer — 72 minutes this week vs 55 last week. What did you work on?", timestamp: "8:31 PM" },
      { id: "4", sender: "user", text: "Building a new feature module. Got into a real flow state.", timestamp: "8:32 PM" },
      { id: "5", sender: "ai", text: "Flow states are your superpower! You enter them more easily on days you meditate first. Did you meditate today?", timestamp: "8:32 PM" },
      { id: "6", sender: "user", text: "Yes, 10 minutes this morning. I think it really does help.", timestamp: "8:33 PM" },
      { id: "7", sender: "ai", text: "That's your 12-day meditation streak! 🎉 How were your energy levels throughout the day?", timestamp: "8:33 PM" },
      { id: "8", sender: "user", text: "Dipped after the 2pm meeting but a walk helped.", timestamp: "8:34 PM" },
      { id: "9", sender: "ai", text: "Smart recovery. Try a 2-minute breathing exercise before meetings to prevent the post-meeting crash. 💫", timestamp: "8:35 PM" },
    ],
  },
  {
    preview: "Discussed feeling overwhelmed and strategies to manage workload.",
    messages: [
      { id: "1", sender: "ai", text: "Hey, how are you doing today?", timestamp: "9:00 PM" },
      { id: "2", sender: "user", text: "Honestly, a bit overwhelmed. Too many things on my plate.", timestamp: "9:01 PM" },
      { id: "3", sender: "ai", text: "I hear you. Overwhelm often signals that your task list doesn't match your priorities. What's weighing on you most?", timestamp: "9:01 PM" },
      { id: "4", sender: "user", text: "Work deadlines and I haven't exercised in 3 days.", timestamp: "9:02 PM" },
      { id: "5", sender: "ai", text: "Breaking your exercise streak often feeds the overwhelm — movement reduces cortisol. Even a 10-minute walk tomorrow morning can reset your baseline.", timestamp: "9:03 PM" },
      { id: "6", sender: "user", text: "That's a good idea. I'll try that.", timestamp: "9:04 PM" },
      { id: "7", sender: "ai", text: "Great. And for deadlines — write down just the three most critical tasks tonight so tomorrow starts with clarity, not chaos. 🌿", timestamp: "9:04 PM" },
    ],
  },
  {
    preview: "Celebrated a personal milestone and reviewed weekly progress.",
    messages: [
      { id: "1", sender: "ai", text: "Happy Sunday! How did your week wrap up?", timestamp: "7:45 PM" },
      { id: "2", sender: "user", text: "Really well! I hit my reading goal for the first time in months.", timestamp: "7:46 PM" },
      { id: "3", sender: "ai", text: "That's a big deal — consistency with reading has been something you've been working toward. What made this week different?", timestamp: "7:46 PM" },
      { id: "4", sender: "user", text: "I started reading before bed instead of scrolling.", timestamp: "7:47 PM" },
      { id: "5", sender: "ai", text: "Brilliant habit swap. You're replacing a low-value activity with one that serves your growth. I'll track this pattern. 📚", timestamp: "7:48 PM" },
      { id: "6", sender: "user", text: "Also slept better this week overall.", timestamp: "7:49 PM" },
      { id: "7", sender: "ai", text: "The two are connected — reading before bed reduces screen-time blue light and quiets the mind. Your sleep score and mood are both trending up this week. Keep this going! 🌟", timestamp: "7:49 PM" },
    ],
  },
  {
    preview: "Talked through a stressful work situation and emotional response.",
    messages: [
      { id: "1", sender: "ai", text: "Good evening. How are you feeling tonight?", timestamp: "10:15 PM" },
      { id: "2", sender: "user", text: "Stressed. Had a difficult conversation with my manager.", timestamp: "10:16 PM" },
      { id: "3", sender: "ai", text: "That sounds tough. Do you want to talk through what happened, or would you prefer to focus on how you're feeling right now?", timestamp: "10:16 PM" },
      { id: "4", sender: "user", text: "Both, I guess. I feel like my work isn't being recognized.", timestamp: "10:17 PM" },
      { id: "5", sender: "ai", text: "That feeling of invisible effort is deeply frustrating. Did you get a chance to express that in the conversation?", timestamp: "10:18 PM" },
      { id: "6", sender: "user", text: "Not really. I didn't want to seem defensive.", timestamp: "10:19 PM" },
      { id: "7", sender: "ai", text: "Advocating for yourself isn't defensiveness — it's clarity. Next time, try framing it as: 'I want to make sure we're aligned on impact.' That opens conversation without confrontation. 💬", timestamp: "10:20 PM" },
    ],
  },
  {
    preview: "Checked in after a great gym session and nutrition wins.",
    messages: [
      { id: "1", sender: "ai", text: "Hi! How was today?", timestamp: "6:30 PM" },
      { id: "2", sender: "user", text: "Amazing! Hit a new personal best at the gym.", timestamp: "6:31 PM" },
      { id: "3", sender: "ai", text: "Yes! Your exercise streak is back on track after last week's dip. What was the PR?", timestamp: "6:31 PM" },
      { id: "4", sender: "user", text: "Deadlifted 120kg for the first time.", timestamp: "6:32 PM" },
      { id: "5", sender: "ai", text: "That's incredible — your consistency over the last 3 weeks built the foundation for this. How did it feel?", timestamp: "6:32 PM" },
      { id: "6", sender: "user", text: "Honestly empowering. And I ate really clean all day too.", timestamp: "6:33 PM" },
      { id: "7", sender: "ai", text: "Physical wins and nutritional wins compound each other. Days like today are worth anchoring in memory — they remind you what's possible. 🏋️", timestamp: "6:33 PM" },
    ],
  },
  {
    preview: "Explored feelings of creative stagnation and finding inspiration.",
    messages: [
      { id: "1", sender: "ai", text: "Good morning! Starting early today?", timestamp: "7:20 AM" },
      { id: "2", sender: "user", text: "Yeah, couldn't sleep. Feeling creatively stuck.", timestamp: "7:21 AM" },
      { id: "3", sender: "ai", text: "Creative blocks often mask something deeper — boredom, fear, or burnout. Which resonates most?", timestamp: "7:22 AM" },
      { id: "4", sender: "user", text: "Probably fear. Of the work not being good enough.", timestamp: "7:23 AM" },
      { id: "5", sender: "ai", text: "That's the perfectionism trap. The antidote is volume over perfection — create badly, create freely, edit later. What's one tiny creative act you could do in the next 10 minutes?", timestamp: "7:24 AM" },
      { id: "6", sender: "user", text: "Write one paragraph. No editing.", timestamp: "7:25 AM" },
      { id: "7", sender: "ai", text: "Perfect. Go do it. I'll be here when you're back. ✍️", timestamp: "7:25 AM" },
    ],
  },
  {
    preview: "Monthly reflection — major growth areas and patterns.",
    messages: [
      { id: "1", sender: "ai", text: "It's the end of the month — time for a deeper reflection. How do you feel about January overall?", timestamp: "9:00 PM" },
      { id: "2", sender: "user", text: "Better than December. More consistent with habits.", timestamp: "9:01 PM" },
      { id: "3", sender: "ai", text: "The data confirms it — your habit completion rate was 71% vs 54% in December. Meditation and reading drove the most improvement.", timestamp: "9:01 PM" },
      { id: "4", sender: "user", text: "I want to add journaling in February.", timestamp: "9:02 PM" },
      { id: "5", sender: "ai", text: "Smart — but add it to an existing trigger so it stacks. Try journaling right after your morning meditation when you already have a focused headspace.", timestamp: "9:03 PM" },
      { id: "6", sender: "user", text: "That makes sense. Habit stacking.", timestamp: "9:04 PM" },
      { id: "7", sender: "ai", text: "Exactly. You're thinking like someone who understands their own system. That's a meaningful shift. 🌱", timestamp: "9:04 PM" },
    ],
  },
  {
    preview: "Discussed a conflict with a friend and how to move forward.",
    messages: [
      { id: "1", sender: "ai", text: "Hey. You seem a bit quiet tonight — how are you?", timestamp: "8:00 PM" },
      { id: "2", sender: "user", text: "Had a falling out with a close friend. It's been on my mind.", timestamp: "8:01 PM" },
      { id: "3", sender: "ai", text: "Friendship friction is some of the heaviest emotional weight. Do you want to share what happened?", timestamp: "8:02 PM" },
      { id: "4", sender: "user", text: "We disagreed over something I said that came out wrong.", timestamp: "8:03 PM" },
      { id: "5", sender: "ai", text: "Unintentional hurt is the hardest kind — it carries guilt without clear cause. Have you reached out to clarify your intent?", timestamp: "8:04 PM" },
      { id: "6", sender: "user", text: "Not yet. I don't want to make it worse.", timestamp: "8:05 PM" },
      { id: "7", sender: "ai", text: "Silence often feels safer but can solidify misunderstanding. A short message like 'I've been thinking about what happened and I want to understand how you felt' opens a door without pressure. 💛", timestamp: "8:05 PM" },
    ],
  },
  {
    preview: "Set intentions for the week ahead and reviewed goals.",
    messages: [
      { id: "1", sender: "ai", text: "New week starting tomorrow — what are you going into it with?", timestamp: "9:30 PM" },
      { id: "2", sender: "user", text: "I want to focus on finishing the project and being more present.", timestamp: "9:31 PM" },
      { id: "3", sender: "ai", text: "Two strong intentions. 'Being more present' is beautiful — what does that look like in practice for you?", timestamp: "9:32 PM" },
      { id: "4", sender: "user", text: "Phone away during meals and conversations.", timestamp: "9:33 PM" },
      { id: "5", sender: "ai", text: "Simple and powerful. Let's revisit this on Friday to see how it went. I'll note it as an intention for the week.", timestamp: "9:33 PM" },
      { id: "6", sender: "user", text: "Also want to sleep by 11 every night.", timestamp: "9:34 PM" },
      { id: "7", sender: "ai", text: "Your data shows you perform best after 7+ hours of sleep. A consistent 11pm bedtime would be a game-changer. I'll track it for you. 🌙", timestamp: "9:34 PM" },
    ],
  },
  {
    preview: "Processed feelings of gratitude and meaningful moments.",
    messages: [
      { id: "1", sender: "ai", text: "Good evening! Anything worth celebrating today?", timestamp: "8:45 PM" },
      { id: "2", sender: "user", text: "It was a quiet day but I felt really at peace.", timestamp: "8:46 PM" },
      { id: "3", sender: "ai", text: "Peaceful days are underrated. What made it feel that way?", timestamp: "8:46 PM" },
      { id: "4", sender: "user", text: "Had coffee on the balcony in the morning without checking my phone.", timestamp: "8:47 PM" },
      { id: "5", sender: "ai", text: "That's a small act of presence with outsized effect. Moments like that replenish your reserves. Did anything else stand out?", timestamp: "8:48 PM" },
      { id: "6", sender: "user", text: "Called my parents and had a real conversation for once.", timestamp: "8:49 PM" },
      { id: "7", sender: "ai", text: "Connection with family is one of the highest-rated contributors to well-being in your reflection patterns. Days with real conversations consistently score higher on your mood index. Treasure these. ❤️", timestamp: "8:49 PM" },
    ],
  },
];

// Generate sessions spread across the last 3 months (~90 days)
const sessionDayOffsets = [1, 4, 8, 13, 17, 22, 28, 33, 40, 47, 55, 62, 68, 75, 82];

export const avyaaSessions: AvyaaSession[] = sessionDayOffsets.map((offset, i) => ({
  id: `session-${i + 1}`,
  date: format(subDays(today, offset), "yyyy-MM-dd"),
  preview: sessionMessages[i % sessionMessages.length].preview,
  messages: sessionMessages[i % sessionMessages.length].messages,
}));

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
