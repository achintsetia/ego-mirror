const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildInsightsPrompt = (transcriptText) => [
  "You are analyzing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  transcriptText,
  "",
  "Extract the following from what the user shared and return a JSON object with exactly these fields:",
  "- \"goals\": An array of strings — any goals, resolutions, or ambitions the user mentioned (e.g. 'lose 10kg by December', 'read 12 books this year'). Empty array if none mentioned.",
  "- \"goodHabits\": An array of strings — positive habits the user currently has, is building, or wants to continue (e.g. 'morning run', 'reading before bed'). Empty array if none mentioned.",
  "- \"badHabits\": An array of strings — negative habits the user acknowledged, wants to reduce, or is struggling with (e.g. 'too much screen time', 'skipping breakfast'). Empty array if none mentioned.",
  "",
  "Only include items that the user clearly mentioned. Do not infer or invent items.",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.extractUserInsights = onDocumentCreated(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.data();

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

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let goals = [];
      let goodHabits = [];
      let badHabits = [];

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildInsightsPrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          goals = Array.isArray(parsed.goals) ? parsed.goals : [];
          goodHabits = Array.isArray(parsed.goodHabits) ? parsed.goodHabits : [];
          badHabits = Array.isArray(parsed.badHabits) ? parsed.badHabits : [];
        }
      } catch (err) {
        logger.error("extractUserInsights: Gemini extraction failed", {err: err.message, email, dateKey});
        return;
      }

      const db = getFirestore();
      const now = new Date();

      // Merge arrays into the user's document using arrayUnion so entries accumulate over time
      const batch = db.batch();

      if (goals.length > 0) {
        const goalsRef = db.collection("goals").doc(email);
        batch.set(goalsRef, {
          goals: FieldValue.arrayUnion(...goals),
          lastUpdated: now,
          lastSessionDate: dateKey,
        }, {merge: true});
      }

      if (goodHabits.length > 0) {
        const goodHabitsRef = db.collection("goodhabits").doc(email);
        batch.set(goodHabitsRef, {
          habits: FieldValue.arrayUnion(...goodHabits),
          lastUpdated: now,
          lastSessionDate: dateKey,
        }, {merge: true});
      }

      if (badHabits.length > 0) {
        const badHabitsRef = db.collection("badhabits").doc(email);
        batch.set(badHabitsRef, {
          habits: FieldValue.arrayUnion(...badHabits),
          lastUpdated: now,
          lastSessionDate: dateKey,
        }, {merge: true});
      }

      await batch.commit();

      logger.info("User insights extracted and saved", {
        email,
        dateKey,
        goals: goals.length,
        goodHabits: goodHabits.length,
        badHabits: badHabits.length,
      });
    },
);
