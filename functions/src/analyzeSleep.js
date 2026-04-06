const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildSleepPrompt = (transcriptText) => [
  "You are a sleep analyst reviewing a daily reflection conversation between a user and their AI companion Avyaa.",
  "",
  "Conversation:",
  transcriptText,
  "",
  "Analyze what the user shared about their sleep last night. Return a JSON object with exactly these fields:",
  "- \"hoursSlept\": A number (float) representing how many hours the user slept. Null if not mentioned.",
  "- \"sleepQuality\": One of: \"excellent\", \"good\", \"okay\", \"poor\", \"terrible\". Infer from what the user described. Null if not mentioned.",
  "- \"bedtime\": Approximate bedtime as a string (e.g. \"11:30 PM\"). Null if not mentioned.",
  "- \"wakeTime\": Approximate wake time as a string (e.g. \"7:00 AM\"). Null if not mentioned.",
  "- \"observations\": An array of strings — notable things the user mentioned about their sleep (e.g. 'Woke up multiple times', 'Had vivid dreams', 'Felt rested'). Empty array if none.",
  "- \"notes\": A single optional string summarising the sleep in one sentence. Null if no sleep data was shared.",
  "",
  "If the user mentioned no sleep information at all, return { \"hoursSlept\": null, \"sleepQuality\": null, \"bedtime\": null, \"wakeTime\": null, \"observations\": [], \"notes\": null }.",
  "Return only valid JSON with no extra text.",
].join("\n");

exports.analyzeSleep = onDocumentWritten(
    {
      document: "conversations/{email}/sessions/{dateKey}",
      region: "asia-south1",
    },
    async (event) => {
      const {email, dateKey} = event.params;
      const sessionData = event.data?.after?.data();

      if (!sessionData) {
        logger.warn("analyzeSleep: no document data", {email, dateKey});
        return;
      }

      const transcript = sessionData.transcript;
      if (!Array.isArray(transcript) || transcript.length === 0) {
        logger.warn("analyzeSleep: empty transcript, skipping", {email, dateKey});
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.error("analyzeSleep: GEMINI_API_KEY not configured");
        return;
      }

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let hoursSlept = null;
      let sleepQuality = null;
      let bedtime = null;
      let wakeTime = null;
      let observations = [];
      let notes = null;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(buildSleepPrompt(transcriptText));
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          hoursSlept = typeof parsed.hoursSlept === "number" ? parsed.hoursSlept : null;
          sleepQuality = parsed.sleepQuality ?? null;
          bedtime = parsed.bedtime ?? null;
          wakeTime = parsed.wakeTime ?? null;
          observations = Array.isArray(parsed.observations) ? parsed.observations : [];
          notes = parsed.notes ?? null;
        }
      } catch (err) {
        logger.error("analyzeSleep: Gemini analysis failed", {err: err.message, email, dateKey});
        return;
      }

      if (hoursSlept === null && sleepQuality === null && observations.length === 0) {
        logger.info("analyzeSleep: no sleep data found in transcript, skipping write", {email, dateKey});
        return;
      }

      const db = getFirestore();
      const entryRef = db.collection("sleep").doc(email).collection("entries").doc(dateKey);

      const existingSnap = await entryRef.get();

      await entryRef.set({
        dateKey,
        hoursSlept,
        sleepQuality,
        bedtime,
        wakeTime,
        observations,
        notes,
        sessionCount: sessionData.sessionCount ?? 1,
        createdAt: existingSnap.exists ? existingSnap.data().createdAt : new Date(),
        updatedAt: new Date(),
      });

      logger.info("Sleep entry saved", {email, dateKey, hoursSlept, sleepQuality});
    },
);
