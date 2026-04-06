const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildContextPrompt = (data) => {
  const lines = [
    "You are summarizing a user's life context for an AI companion called Avyaa.",
    "The summary will be injected into Avyaa's system prompt so she can have a meaningful, personalized conversation.",
    "Write in second person (\"you\", \"your\") as if speaking to the user.",
    "Be warm, specific, and concise. Focus on things that are useful for a daily check-in.",
    "",
    "Here is the user's current data:",
    "",
  ];

  if (data.goals?.length) {
    lines.push(`GOALS (current list): ${data.goals.join(", ")}`);
  }
  if (data.goalsRecent?.newItems?.length || data.goalsRecent?.resolvedItems?.length) {
    if (data.goalsRecent.newItems.length) {
      lines.push(`GOALS ADDED in last session [${data.goalsRecent.dateKey}]: ${data.goalsRecent.newItems.join(", ")}`);
    }
    if (data.goalsRecent.resolvedItems.length) {
      lines.push(`GOALS RESOLVED in last session [${data.goalsRecent.dateKey}]: ${data.goalsRecent.resolvedItems.join(", ")}`);
    }
  }
  if (data.goodHabits?.length) {
    lines.push(`GOOD HABITS BUILDING (current list): ${data.goodHabits.join(", ")}`);
  }
  if (data.goodHabitsRecent?.newItems?.length || data.goodHabitsRecent?.resolvedItems?.length) {
    if (data.goodHabitsRecent.newItems.length) {
      lines.push(`GOOD HABITS ADDED in last session [${data.goodHabitsRecent.dateKey}]: ${data.goodHabitsRecent.newItems.join(", ")}`);
    }
    if (data.goodHabitsRecent.resolvedItems.length) {
      lines.push(`GOOD HABITS RESOLVED in last session [${data.goodHabitsRecent.dateKey}]: ${data.goodHabitsRecent.resolvedItems.join(", ")}`);
    }
  }
  if (data.badHabits?.length) {
    lines.push(`BAD HABITS TO ADDRESS (current list): ${data.badHabits.join(", ")}`);
  }
  if (data.badHabitsRecent?.newItems?.length || data.badHabitsRecent?.resolvedItems?.length) {
    if (data.badHabitsRecent.newItems.length) {
      lines.push(`BAD HABITS ADDED in last session [${data.badHabitsRecent.dateKey}]: ${data.badHabitsRecent.newItems.join(", ")}`);
    }
    if (data.badHabitsRecent.resolvedItems.length) {
      lines.push(`BAD HABITS RESOLVED in last session [${data.badHabitsRecent.dateKey}]: ${data.badHabitsRecent.resolvedItems.join(", ")}`);
    }
  }
  if (data.openTodos?.length) {
    lines.push(`OPEN TO-DOs: ${data.openTodos.join(", ")}`);
  }
  if (data.recentSessions?.length) {
    lines.push("");
    lines.push("RECENT CONVERSATION SUMMARIES (most recent first):");
    data.recentSessions.forEach((s, i) => {
      lines.push(`[${s.dateKey}] ${s.summary}`);
      if (i === 0 && s.mood) lines.push(`Mood last session: ${s.mood}`);
    });
  }
  if (data.latestSleep) {
    lines.push(`LATEST SLEEP: ${JSON.stringify(data.latestSleep)}`);
  }
  if (data.latestProductivity) {
    lines.push(`LATEST PRODUCTIVITY: ${JSON.stringify(data.latestProductivity)}`);
  }
  if (data.latestFood) {
    lines.push(`LATEST FOOD INTAKE: ${JSON.stringify(data.latestFood)}`);
  }
  if (data.latestExercise) {
    lines.push(`LATEST EXERCISE: ${JSON.stringify(data.latestExercise)}`);
  }

  lines.push("");
  lines.push("Write a warm, concise paragraph (4-6 sentences) summarizing the most important context Avyaa should know before starting today's conversation. Highlight any open goals, habits in progress, pending to-dos, or patterns from recent sessions that are worth following up on.");

  return lines.join("\n");
};

exports.getUserContext = onCall(
    {region: "asia-south1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be signed in.");
      }

      const email = request.auth.token.email;
      if (!email) {
        throw new HttpsError("invalid-argument", "User account must have an email.");
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new HttpsError("internal", "Gemini API key is not configured.");
      }

      const db = getFirestore();

      // Fetch all relevant collections in parallel
      const [
        goalsSnap,
        goodHabitsSnap,
        badHabitsSnap,
        todoSnap,
        recentSessionsSnap,
        sleepSnap,
        productivitySnap,
        foodSnap,
        exerciseSnap,
        goalsDailySnap,
        goodHabitsDailySnap,
        badHabitsDailySnap,
      ] = await Promise.all([
        db.collection("goals").doc(email).get(),
        db.collection("goodhabits").doc(email).get(),
        db.collection("badhabits").doc(email).get(),
        db.collection("todo").doc(email).get(),
        db.collection("conversations").doc(email).collection("sessions")
            .orderBy("createdAt", "desc").limit(5).get(),
        db.collection("sleep").doc(email).collection("entries")
            .orderBy("createdAt", "desc").limit(1).get(),
        db.collection("productivity").doc(email).collection("entries")
            .orderBy("createdAt", "desc").limit(1).get(),
        db.collection("food").doc(email).collection("entries")
            .orderBy("createdAt", "desc").limit(1).get(),
        db.collection("exercise").doc(email).collection("entries")
            .orderBy("createdAt", "desc").limit(1).get(),
        db.collection("goals").doc(email).collection("daily")
            .orderBy("timestamp", "desc").limit(1).get(),
        db.collection("goodhabits").doc(email).collection("daily")
            .orderBy("timestamp", "desc").limit(1).get(),
        db.collection("badhabits").doc(email).collection("daily")
            .orderBy("timestamp", "desc").limit(1).get(),
      ]);

      const goals = goalsSnap.exists ? (goalsSnap.data().items ?? []) : [];
      const goodHabits = goodHabitsSnap.exists ? (goodHabitsSnap.data().items ?? []) : [];
      const badHabits = badHabitsSnap.exists ? (badHabitsSnap.data().items ?? []) : [];

      const extractDailyChanges = (snap) => {
        if (snap.empty) return null;
        const d = snap.docs[0].data();
        return {
          dateKey: snap.docs[0].id,
          newItems: d.newItems ?? [],
          resolvedItems: d.resolvedItems ?? [],
        };
      };
      const goalsRecent = extractDailyChanges(goalsDailySnap);
      const goodHabitsRecent = extractDailyChanges(goodHabitsDailySnap);
      const badHabitsRecent = extractDailyChanges(badHabitsDailySnap);

      const allTodos = todoSnap.exists ? (todoSnap.data().items ?? []) : [];
      const openTodos = allTodos.filter((t) => t.status === "open").map((t) => t.text);

      const recentSessions = recentSessionsSnap.docs.map((d) => ({
        dateKey: d.id,
        summary: d.data().summary ?? null,
        mood: d.data().mood ?? null,
      })).filter((s) => s.summary);

      const latestSleep = sleepSnap.empty ? null : (() => {
        const d = sleepSnap.docs[0].data();
        return {hoursSlept: d.hoursSlept, quality: d.sleepQuality, bedtime: d.bedtime, wakeTime: d.wakeTime};
      })();

      const latestProductivity = productivitySnap.empty ? null : (() => {
        const d = productivitySnap.docs[0].data();
        return {score: d.productivityScore, hours: d.productiveHours, focusAreas: d.focusAreas};
      })();

      const latestFood = foodSnap.empty ? null : (() => {
        const d = foodSnap.docs[0].data();
        return {calories: d.totalCalories, meals: d.meals};
      })();

      const latestExercise = exerciseSnap.empty ? null : (() => {
        const d = exerciseSnap.docs[0].data();
        return {duration: d.durationMinutes, type: d.exerciseType, intensity: d.intensity};
      })();

      const contextData = {goals, goodHabits, badHabits, openTodos, recentSessions,
        goalsRecent, goodHabitsRecent, badHabitsRecent,
        latestSleep, latestProductivity, latestFood, latestExercise};

      // If there's no meaningful data yet, return a neutral summary
      const hasData = goals.length || goodHabits.length || badHabits.length ||
        openTodos.length || recentSessions.length;

      if (!hasData) {
        logger.info("getUserContext: no data yet for user", {email});
        return {contextSummary: null};
      }

      // Use Gemini Flash to synthesize a personalized context summary
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
        const result = await model.generateContent(buildContextPrompt(contextData));
        const contextSummary = result.response.text().trim();
        logger.info("getUserContext: summary generated", {email, summary: contextSummary});
        return {contextSummary};
      } catch (err) {
        logger.error("getUserContext: Gemini summarization failed", {err: err.message, email});
        // Return structured data as fallback so the session can still start
        return {contextSummary: null, fallback: contextData};
      }
    },
);
