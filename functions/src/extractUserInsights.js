const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildInsightsPrompt = (transcriptText, currentGoals, currentGoodHabits, currentBadHabits) => [
  "You are maintaining a user's master lists of goals, good habits, and bad habits based on their daily conversations with their AI companion Avyaa.",
  "",
  "Current master lists:",
  `goals: ${JSON.stringify(currentGoals)}`,
  `goodHabits: ${JSON.stringify(currentGoodHabits)}`,
  `badHabits: ${JSON.stringify(currentBadHabits)}`,
  "",
  "New conversation:",
  transcriptText,
  "",
  "Update the master lists based on what the user shared. Rules:",
  "- Add any new goals, good habits, or bad habits the user mentioned.",
  "- Remove or replace items that the user indicated they no longer have or have resolved.",
  "- Merge duplicates or near-duplicates into a single canonical item.",
  "- Keep items from the current lists that were not contradicted.",
  "- Only include items the user has actually expressed — do not infer or invent.",
  "",
  "Return a JSON object with exactly these fields:",
  "- \"goals\": Updated array of the user's goals and resolutions.",
  "- \"goodHabits\": Updated array of the user's positive habits.",
  "- \"badHabits\": Updated array of the user's negative habits they want to address.",
  "",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.extractUserInsights = onDocumentWritten(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.after?.data();

      if (!sessionData) {
        logger.warn("extractUserInsights: no document data", {email, dateKey});
        return;
      }

      const transcript = sessionData.transcript;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn("extractUserInsights: empty transcript, skipping", {email, dateKey});
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("extractUserInsights: GEMINI_API_KEY not configured");
        return;
      }

      const db = getFirestore();
      const now = new Date();

      // Read current master lists
      const [goalsSnap, goodHabitsSnap, badHabitsSnap] = await Promise.all([
        db.collection("goals").doc(email).get(),
        db.collection("goodhabits").doc(email).get(),
        db.collection("badhabits").doc(email).get(),
      ]);

      const currentGoals = goalsSnap.exists ? (goalsSnap.data().items ?? []) : [];
      const currentGoodHabits = goodHabitsSnap.exists ? (goodHabitsSnap.data().items ?? []) : [];
      const currentBadHabits = badHabitsSnap.exists ? (badHabitsSnap.data().items ?? []) : [];

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let goals = currentGoals;
      let goodHabits = currentGoodHabits;
      let badHabits = currentBadHabits;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(
            buildInsightsPrompt(transcriptText, currentGoals, currentGoodHabits, currentBadHabits),
        );
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          goals = Array.isArray(parsed.goals) ? parsed.goals : currentGoals;
          goodHabits = Array.isArray(parsed.goodHabits) ? parsed.goodHabits : currentGoodHabits;
          badHabits = Array.isArray(parsed.badHabits) ? parsed.badHabits : currentBadHabits;
        }
      } catch (err) {
        logger.error("extractUserInsights: Gemini extraction failed", {err: err.message, email, dateKey});
        return;
      }

      // Write updated master lists as simple flat documents
      const batch = db.batch();

      batch.set(db.collection("goals").doc(email), {
        items: goals,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });

      batch.set(db.collection("goodhabits").doc(email), {
        items: goodHabits,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });

      batch.set(db.collection("badhabits").doc(email), {
        items: badHabits,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });

      await batch.commit();

      logger.info("User insights updated", {
        email,
        dateKey,
        goals: goals.length,
        goodHabits: goodHabits.length,
        badHabits: badHabits.length,
      });
    },
);
