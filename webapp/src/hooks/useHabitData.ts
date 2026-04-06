import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type ChartRange = "7d" | "30d" | "3m";

export interface ChartPoint {
  label: string;
  value: number | null;
}

export interface Meal {
  name: string;
  description: string;
  approximateCalories: number;
}

export interface FoodEntry {
  meals: Meal[];
  totalCalories: number;
  notes: string | null;
  dateKey: string;
}

export interface Activity {
  name: string;
  description: string;
  durationMinutes: number;
  caloriesBurned: number;
}

export interface ExerciseEntry {
  activities: Activity[];
  totalDurationMinutes: number;
  totalCaloriesBurned: number;
  notes: string | null;
  dateKey: string;
}

export interface SleepEntry {
  hoursSlept: number | null;
  sleepQuality: string | null;
  bedtime: string | null;
  wakeTime: string | null;
  observations: string[];
  notes: string | null;
  dateKey: string;
}

export interface HabitData {
  loading: boolean;
  chartLoading: boolean;
  goodHabits: string[];
  badHabits: string[];
  goals: string[];
  latestFood: FoodEntry | null;
  latestExercise: ExerciseEntry | null;
  latestSleep: SleepEntry | null;
  sleepChart: ChartPoint[];
  exerciseChart: ChartPoint[];
  caloriesChart: ChartPoint[];
  productivityChart: ChartPoint[];
}

const rangeToLimit = (range: ChartRange) => {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return 90;
};

const dateKeyToLabel = (dateKey: string, range: ChartRange): string => {
  const [d, m, y] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (range === "7d") return date.toLocaleDateString("en", { weekday: "short" });
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

const fetchChartDocs = async (
  email: string,
  collectionName: string,
  n: number,
): Promise<Array<Record<string, unknown> & { dateKey: string }>> => {
  const snap = await getDocs(
    query(collection(db, collectionName, email, "entries"), orderBy("createdAt", "desc"), limit(n)),
  );
  return snap.docs.reverse().map((d) => ({ ...d.data(), dateKey: d.id }));
};

const todayDateKey = () => {
  const now = new Date();
  return [
    String(now.getDate()).padStart(2, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    now.getFullYear(),
  ].join("-");
};

const fetchLatestEntry = async <T>(
  email: string,
  collectionName: string,
): Promise<T | null> => {
  const todayKey = todayDateKey();
  // Try today first
  const todaySnap = await getDoc(doc(db, collectionName, email, "entries", todayKey));
  if (todaySnap.exists()) return { ...todaySnap.data(), dateKey: todaySnap.id } as T;
  // Fall back to most recent
  const recentSnap = await getDocs(
    query(collection(db, collectionName, email, "entries"), orderBy("createdAt", "desc"), limit(1)),
  );
  if (!recentSnap.empty) {
    return { ...recentSnap.docs[0].data(), dateKey: recentSnap.docs[0].id } as T;
  }
  return null;
};

export const useHabitData = (range: ChartRange = "7d"): HabitData => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [goodHabits, setGoodHabits] = useState<string[]>([]);
  const [badHabits, setBadHabits] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [latestFood, setLatestFood] = useState<FoodEntry | null>(null);
  const [latestExercise, setLatestExercise] = useState<ExerciseEntry | null>(null);
  const [latestSleep, setLatestSleep] = useState<SleepEntry | null>(null);
  const [sleepChart, setSleepChart] = useState<ChartPoint[]>([]);
  const [exerciseChart, setExerciseChart] = useState<ChartPoint[]>([]);
  const [caloriesChart, setCaloriesChart] = useState<ChartPoint[]>([]);
  const [productivityChart, setProductivityChart] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const email = user.email;

    (async () => {
      try {
        const [goodHabitsSnap, badHabitsSnap, goalsSnap, food, exercise, sleep] =
          await Promise.all([
            getDoc(doc(db, "goodhabits", email)),
            getDoc(doc(db, "badhabits", email)),
            getDoc(doc(db, "goals", email)),
            fetchLatestEntry<FoodEntry>(email, "food"),
            fetchLatestEntry<ExerciseEntry>(email, "exercise"),
            fetchLatestEntry<SleepEntry>(email, "sleep"),
          ]);

        setGoodHabits(goodHabitsSnap.exists() ? (goodHabitsSnap.data().items ?? []) : []);
        setBadHabits(badHabitsSnap.exists() ? (badHabitsSnap.data().items ?? []) : []);
        setGoals(goalsSnap.exists() ? (goalsSnap.data().items ?? []) : []);
        setLatestFood(food);
        setLatestExercise(exercise);
        setLatestSleep(sleep);
      } catch (err) {
        console.error("useHabitData: fetch failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  // Chart data — refetches whenever range changes
  useEffect(() => {
    if (!user?.email) {
      setChartLoading(false);
      return;
    }
    const email = user.email;
    const n = rangeToLimit(range);
    setChartLoading(true);
    (async () => {
      try {
        const [sleepDocs, exerciseDocs, foodDocs, productivityDocs] = await Promise.all([
          fetchChartDocs(email, "sleep", n),
          fetchChartDocs(email, "exercise", n),
          fetchChartDocs(email, "food", n),
          fetchChartDocs(email, "productivity", n),
        ]);
        setSleepChart(sleepDocs.map((d) => ({
          label: dateKeyToLabel(d.dateKey, range),
          value: (d.hoursSlept as number | null) ?? null,
        })));
        setExerciseChart(exerciseDocs.map((d) => ({
          label: dateKeyToLabel(d.dateKey, range),
          value: (d.totalDurationMinutes as number | null) ?? null,
        })));
        setCaloriesChart(foodDocs.map((d) => ({
          label: dateKeyToLabel(d.dateKey, range),
          value: (d.totalCalories as number | null) ?? null,
        })));
        setProductivityChart(productivityDocs.map((d) => ({
          label: dateKeyToLabel(d.dateKey, range),
          value: (d.productivityScore as number | null) ?? null,
        })));
      } catch (err) {
        console.error("useHabitData: chart fetch failed", err);
      } finally {
        setChartLoading(false);
      }
    })();
  }, [user?.email, range]);

  return {
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
  };
};
