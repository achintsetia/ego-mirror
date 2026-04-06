const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildFoodPrompt = (transcriptText) => [
  "You are a nutrition analyst reviewing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  transcriptText,
  "",
  "Analyze what the user shared about their food and drink intake today. Return a JSON object with exactly these fields:",
  "- \"meals\": An array of meal objects, each with:",
  "    - \"name\": Short name for the meal (e.g. \"Breakfast\", \"Lunch\", \"Dinner\", \"Snack\", \"Evening tea\").",
  "    - \"description\": What the user ate/drank for that meal, as described.",
  "    - \"approximateCalories\": Estimated calorie count as an integer. Base estimates on typical Indian/international portion sizes if unspecified.",
  "- \"totalCalories\": Integer — sum of all meal calories.",
  "- \"notes\": A single optional string with any relevant nutrition observation (e.g. 'Skipped breakfast', 'High protein day'). Null if nothing notable.",
  "",
  "Only include meals the user explicitly mentioned. If the user mentioned no food at all, return { \"meals\": [], \"totalCalories\": 0, \"notes\": null }.",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.analyzeFoodIntake = onDocumentWritten(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.after?.data();

      if (!sessionData) {
        logger.warn("analyzeFoodIntake: no document data", {email, dateKey});
        return;
      }

      const transcript = sessionData.transcript;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn("analyzeFoodIntake: empty transcript, skipping", {email, dateKey});
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("analyzeFoodIntake: GEMINI_API_KEY not configured");
        return;
      }

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let meals = [];
      let totalCalories = 0;
      let notes = null;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildFoodPrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          meals = Array.isArray(parsed.meals) ? parsed.meals : [];
          totalCalories = typeof parsed.totalCalories === "number" ? parsed.totalCalories : 0;
          notes = parsed.notes ?? null;
        }
      } catch (err) {
        logger.error("analyzeFoodIntake: Gemini analysis failed", {err: err.message, email, dateKey});
        return;
      }

      if (meals.length === 0 && totalCalories === 0) {
        logger.info("analyzeFoodIntake: no food data found in transcript, skipping write", {email, dateKey});
        return;
      }

      const db = getFirestore();
      const entryRef = db.collection("food").doc(email).collection("entries").doc(dateKey);

      const existingSnap = await entryRef.get();

      await entryRef.set({
        dateKey,
        meals,
        totalCalories,
        notes,
        sessionCount: sessionData.sessionCount ?? 1,
        createdAt: existingSnap.exists ? existingSnap.data().createdAt : new Date(),
        updatedAt: new Date(),
      });

      logger.info("Food intake saved", {email, dateKey, meals: meals.length, totalCalories});
    },
);
