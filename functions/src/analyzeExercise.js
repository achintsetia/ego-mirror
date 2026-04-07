const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildExercisePrompt = (transcriptText) => [
  "You are a fitness analyst reviewing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  transcriptText,
  "",
  "Analyze what the user shared about their physical activity and exercise today. Return a JSON object with exactly these fields:",
  "- \"activities\": An array of activity objects, each with:",
  "    - \"name\": Name of the activity (e.g. \"Running\", \"Gym\", \"Walk\", \"Yoga\", \"Cycling\").",
  "    - \"description\": Brief description of what the user did, as they described it.",
  "    - \"durationMinutes\": Estimated duration in minutes as an integer.",
  "    - \"caloriesBurned\": Approximate calories burned as an integer, based on typical values for the activity and duration.",
  "- \"totalDurationMinutes\": Integer — total minutes of exercise across all activities.",
  "- \"totalCaloriesBurned\": Integer — sum of calories burned across all activities.",
  "- \"notes\": A single optional string with any relevant observation (e.g. 'Rest day', 'First workout this week'). Null if nothing notable.",
  "",
  "Only include activities the user explicitly mentioned. If the user mentioned no exercise at all, return { \"activities\": [], \"totalDurationMinutes\": 0, \"totalCaloriesBurned\": 0, \"notes\": null }.",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.analyzeExercise = onDocumentWritten(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.after?.data();

      if (!sessionData) {
        logger.warn("analyzeExercise: no document data", {email, dateKey});
        return;
      }

      const transcript = sessionData.transcript;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn("analyzeExercise: empty transcript, skipping", {email, dateKey});
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("analyzeExercise: GEMINI_API_KEY not configured");
        return;
      }

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let activities = [];
      let totalDurationMinutes = 0;
      let totalCaloriesBurned = 0;
      let notes = null;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildExercisePrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          activities = Array.isArray(parsed.activities) ? parsed.activities : [];
          totalDurationMinutes = typeof parsed.totalDurationMinutes === "number" ? parsed.totalDurationMinutes : 0;
          totalCaloriesBurned = typeof parsed.totalCaloriesBurned === "number" ? parsed.totalCaloriesBurned : 0;
          notes = parsed.notes ?? null;
        }
      } catch (err) {
        logger.error("analyzeExercise: Gemini analysis failed", {err: err.message, email, dateKey});
        return;
      }

      if (activities.length === 0 && totalDurationMinutes === 0) {
        logger.info("analyzeExercise: no exercise data found in transcript, skipping write", {email, dateKey});
        return;
      }

      const db = getFirestore();
      const entryRef = db.collection("exercise").doc(email).collection("entries").doc(dateKey);

      const existingSnap = await entryRef.get();

      await entryRef.set({
        dateKey,
        activities,
        totalDurationMinutes,
        totalCaloriesBurned,
        notes,
        sessionCount: sessionData.sessionCount ?? 1,
        createdAt: existingSnap.exists ? existingSnap.data().createdAt : new Date(),
        updatedAt: new Date(),
      });

      logger.info("Exercise entry saved", {email, dateKey, activities: activities.length, totalDurationMinutes, totalCaloriesBurned});
    },
);
