import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths } from "date-fns";

export interface TranscriptMessage {
  role: "model" | "user";
  text: string;
  timestamp?: string;
}

export interface VoiceSession {
  id: string;       // dateKey DD-MM-YYYY (Firestore doc ID)
  isoDate: string;  // YYYY-MM-DD for display/grouping
  createdAt: Date;
  summary: string | null;
  transcript: TranscriptMessage[];
}

export interface VoiceSessionHistoryData {
  sessions: VoiceSession[];
  loading: boolean;
}

function dateKeyToISO(dateKey: string): string {
  const [d, m, y] = dateKey.split("-");
  return `${y}-${m}-${d}`;
}

export const useVoiceSessionHistory = (): VoiceSessionHistoryData => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const threeMonthsAgo = Timestamp.fromDate(subMonths(new Date(), 3));

    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "conversations", user.email, "sessions"),
            where("createdAt", ">=", threeMonthsAgo),
            orderBy("createdAt", "desc"),
          ),
        );
        const fetched: VoiceSession[] = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            isoDate: dateKeyToISO(docSnap.id),
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
            summary: (data.summary as string) ?? null,
            transcript: Array.isArray(data.transcript)
              ? (data.transcript as TranscriptMessage[])
              : [],
          };
        });
        setSessions(fetched);
      } catch (err) {
        console.error("useVoiceSessionHistory: failed to fetch sessions", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  return { sessions, loading };
};
