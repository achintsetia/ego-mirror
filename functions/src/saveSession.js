const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildSummaryPrompt = (text) => [
  "You are analyzing a daily reflection conversation between a user and their AI companion Srishti.",
  "",
  "Conversation:",
  text,
  "",
  "Return a JSON object with exactly these fields:",
  "- \"summary\": A detailed paragraph covering what Srishti asked and what the user shared.",
  "- \"mood\": The user overall mood — one of: great, good, okay, low, rough.",
  "- \"topics\": Array of up to 5 key topics discussed.",
  "- \"keyMoments\": Array of up to 5 notable things the user shared or insights that emerged.",
].join("\n");

exports.saveSession = onCall(
    {region: "asia-south1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be signed in.");
      }

      const {transcript} = request.data;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        throw new HttpsError("invalid-argument", "transcript must be a non-empty array.");
      }

      const email = request.auth.token.email;
      if (!email) {
        throw new HttpsError("invalid-argument", "User account must have an email.");
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new HttpsError("internal", "Gemini API key is not configured.");
      }

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Srishti" : "User"}: ${m.text}`)
          .join("\n");

      let summary = null;
      let mood = "okay";
      let topics = [];
      let keyMoments = [];

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildSummaryPrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          summary = parsed.summary ?? null;
          mood = parsed.mood ?? "okay";
          topics = Array.isArray(parsed.topics) ? parsed.topics : [];
          keyMoments = Array.isArray(parsed.keyMoments) ? parsed.keyMoments : [];
        }
      } catch (err) {
        logger.warn("Failed to generate session summary", {err: err.message});
      }

      const now = new Date();
      const dateKey = [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        now.getFullYear(),
      ].join("/");

      const db = getFirestore();
      await db
          .collection("conversations")
          .doc(email)
          .collection("sessions")
          .doc(dateKey)
          .set({
            date: now,
            summary,
            mood,
            topics,
            keyMoments,
            transcript,
            createdAt: now,
          });

      logger.info("Session saved", {email, dateKey});
      return {dateKey};
    },
);
