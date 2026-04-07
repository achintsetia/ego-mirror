const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildSummaryPrompt = (text) => [
  "You are analyzing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  text,
  "",
  "Return a JSON object with exactly these fields:",
  "- \"summary\": A detailed paragraph covering what Avyaa asked and what the user shared.",
  "- \"mood\": The user overall mood — one of: great, good, okay, low, rough.",
  "- \"topics\": Array of up to 5 key topics discussed.",
  "- \"keyMoments\": Array of up to 5 notable things the user shared or insights that emerged. Write each item in second person, addressing the user directly — use 'you' and 'your' instead of 'User' or 'the user'. For example: 'You are building an AI agent system' instead of 'User is building an AI agent system'.",
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

      const now = new Date();
      const dateKey = [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        now.getFullYear(),
      ].join("-");

      const db = getFirestore();
      const sessionRef = db
          .collection("conversations")
          .doc(email)
          .collection("sessions")
          .doc(dateKey);

      // Merge with existing session if one already exists for today
      const existingSnap = await sessionRef.get();
      let mergedTranscript = transcript;
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        const existingTranscript = Array.isArray(existingData.transcript) ? existingData.transcript : [];
        // Append new entries after existing ones, avoiding exact duplicates
        const existingTexts = new Set(existingTranscript.map((m) => m.timestamp + m.text));
        const newEntries = transcript.filter((m) => !existingTexts.has(m.timestamp + m.text));
        mergedTranscript = [...existingTranscript, ...newEntries];
        logger.info("Merging session transcripts", {email, dateKey, existing: existingTranscript.length, new: newEntries.length});
      }

      const transcriptText = mergedTranscript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let summary = null;
      let mood = "okay";
      let topics = [];
      let keyMoments = [];

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
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

      await sessionRef.set({
        date: existingSnap.exists ? existingSnap.data().date : now,
        summary,
        mood,
        topics,
        keyMoments,
        transcript: mergedTranscript,
        createdAt: existingSnap.exists ? existingSnap.data().createdAt : now,
        updatedAt: now,
        sessionCount: existingSnap.exists ? (existingSnap.data().sessionCount ?? 1) + 1 : 1,
      });

      logger.info("Session saved", {email, dateKey, merged: existingSnap.exists});
      return {dateKey};
    },
);
