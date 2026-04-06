import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export type MoodType = "great" | "good" | "okay" | "low" | "rough";

export const moodEmoji: Record<MoodType, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  low: "😔",
  rough: "😣",
};

export const moodValue: Record<MoodType, number> = {
  great: 5,
  good: 4,
  okay: 3,
  low: 2,
  rough: 1,
};

export interface TodaySnapshot {
  mood: MoodType | null;
  productivityScore: number | null;
  productiveHours: number | null;
  summary: string | null;
  keyMoments: string[];
  focusAreas: string[];
  insights: string | null;
}

export interface WeekEntry {
  day: string;
  mood: number;
  productivity: number;
}

export interface HomeData {
  loading: boolean;
  today: TodaySnapshot;
  week: WeekEntry[];
  goals: string[];
  goodHabits: string[];
  badHabits: string[];
}

const defaultToday = (): TodaySnapshot => ({
  mood: null,
  productivityScore: null,
  productiveHours: null,
  summary: null,
  keyMoments: [],
  focusAreas: [],
  insights: null,
});

const todayDateKey = () => {
  const now = new Date();
  return [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    now.getFullYear(),
  ].join("-");
};

export const useHomeData = (): HomeData => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodaySnapshot>(defaultToday());
  const [week, setWeek] = useState<WeekEntry[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [goodHabits, setGoodHabits] = useState<string[]>([]);
  const [badHabits, setBadHabits] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const email = user.email;
    const todayKey = todayDateKey();

    (async () => {
      try {
        // Try today first; if missing, fall back to most recent session
        let sessionData: Record<string, unknown> | null = null;
        let resolvedDateKey = todayKey;

        const todaySessionSnap = await getDoc(doc(db, "conversations", email, "sessions", todayKey));
        if (todaySessionSnap.exists()) {
          sessionData = todaySessionSnap.data() as Record<string, unknown>;
        } else {
          // Fall back to the most recent session by createdAt
          const recentSnap = await getDocs(
            query(
              collection(db, "conversations", email, "sessions"),
              orderBy("createdAt", "desc"),
              limit(1),
            ),
          );
          if (!recentSnap.empty) {
            const recentDoc = recentSnap.docs[0];
            sessionData = recentDoc.data() as Record<string, unknown>;
            resolvedDateKey = recentDoc.id;
          }
        }

        console.log("[useHomeData] resolved dateKey:", resolvedDateKey, "has session:", !!sessionData);

        // Fetch prod entry for the resolved date + goals/habits in parallel
        const [prodSnap, goalsSnap, goodHabitsSnap, badHabitsSnap] = await Promise.all([
          getDoc(doc(db, "productivity", email, "entries", resolvedDateKey)),
          getDoc(doc(db, "goals", email)),
          getDoc(doc(db, "goodhabits", email)),
          getDoc(doc(db, "badhabits", email)),
        ]);

        const prodData = prodSnap.exists() ? prodSnap.data() : null;
        console.log("[useHomeData] prod exists:", prodSnap.exists());

        setToday({
          mood: (sessionData?.mood as MoodType) ?? null,
          productivityScore: prodData?.productivityScore ?? null,
          productiveHours: prodData?.productiveHours ?? null,
          summary: sessionData?.summary as string ?? null,
          keyMoments: (sessionData?.keyMoments as string[]) ?? [],
          focusAreas: prodData?.focusAreas ?? [],
          insights: prodData?.insights ?? null,
        });

        setGoals(goalsSnap.exists() ? (goalsSnap.data().items ?? []) : []);
        setGoodHabits(goodHabitsSnap.exists() ? (goodHabitsSnap.data().items ?? []) : []);
        setBadHabits(badHabitsSnap.exists() ? (badHabitsSnap.data().items ?? []) : []);
      } catch (err) {
        console.error("useHomeData: failed to fetch primary data", err);
      } finally {
        setLoading(false);
      }

      // Week chart — separate fetch so a missing index doesn't break the main data
      try {
        const weekSnap = await getDocs(
          query(
            collection(db, "productivity", email, "entries"),
            orderBy("date", "desc"),
            limit(7),
          ),
        );
        const weekEntries: WeekEntry[] = weekSnap.docs
          .map((d) => {
            const data = d.data();
            const date = data.date?.toDate ? data.date.toDate() : new Date();
            return {
              day: format(date, "EEE"),
              mood: moodValue[(data.mood as MoodType)] ?? 3,
              productivity: data.productivityScore ?? 5,
            };
          })
          .reverse();
        setWeek(weekEntries);
      } catch (err) {
        console.warn("useHomeData: week chart fetch failed (index may be missing)", err);
      }
    })();
  }, [user?.email]);

  return { loading, today, week, goals, goodHabits, badHabits };
};
