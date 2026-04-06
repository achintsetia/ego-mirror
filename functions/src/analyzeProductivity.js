const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildProductivityPrompt = (transcriptText) => [
  "You are a productivity analyst reviewing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  transcriptText,
  "",
  "Analyze what the user shared about their day and return a JSON object with exactly these fields:",
  "- \"productiveHours\": A number (float, 0–24) estimating how many hours the user was productively working or engaged in meaningful tasks based on what they described.",
  "- \"productivityScore\": A number (integer, 1–10) rating the user's overall productivity for the day.",
  "- \"tasksCompleted\": An array of strings listing specific tasks or accomplishments the user mentioned completing.",
  "- \"focusAreas\": An array of strings (up to 4) representing the main areas the user worked on (e.g. \"deep work\", \"exercise\", \"learning\", \"meetings\").",
  "- \"blockers\": An array of strings listing anything that hindered the user's productivity (empty array if none mentioned).",
  "- \"insights\": A single sentence insight about the user's productivity pattern based on the conversation.",
  "",
  "If the user did not share enough information to determine a value, use sensible defaults (0 for hours, 5 for score, empty arrays).",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.analyzeProductivity = onDocumentCreated(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.data();

      if (!sessionData) {
        logger.warn("analyzeProductivity: no document data", {email, dateKey});
        return;
      }

      const transcript = sessionData.transcript;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn("analyzeProductivity: empty transcript, skipping", {email, dateKey});
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("analyzeProductivity: GEMINI_API_KEY not configured");
        return;
      }

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let productiveHours = 0;
      let productivityScore = 5;
      let tasksCompleted = [];
      let focusAreas = [];
      let blockers = [];
      let insights = null;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildProductivityPrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          productiveHours = typeof parsed.productiveHours === "number" ? parsed.productiveHours : 0;
          productivityScore = typeof parsed.productivityScore === "number" ? parsed.productivityScore : 5;
          tasksCompleted = Array.isArray(parsed.tasksCompleted) ? parsed.tasksCompleted : [];
          focusAreas = Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [];
          blockers = Array.isArray(parsed.blockers) ? parsed.blockers : [];
          insights = parsed.insights ?? null;
        }
      } catch (err) {
        logger.error("analyzeProductivity: Gemini analysis failed", {err: err.message, email, dateKey});
        return;
      }

      const db = getFirestore();
      await db
          .collection("productivity")
          .doc(email)
          .collection("entries")
          .doc(dateKey)
          .set({
            date: sessionData.date ?? new Date(),
            dateKey,
            productiveHours,
            productivityScore,
            tasksCompleted,
            focusAreas,
            blockers,
            insights,
            mood: sessionData.mood ?? null,
            createdAt: new Date(),
          });

      logger.info("Productivity entry saved", {email, dateKey, productiveHours, productivityScore});
    },
);
