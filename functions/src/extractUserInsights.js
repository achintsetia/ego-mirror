const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const {randomUUID} = require("crypto");
const logger = require("firebase-functions/logger");

if (!getApps().length) initializeApp();

const buildInsightsPrompt = (transcriptText, currentGoals, currentGoodHabits, currentBadHabits, currentOpenTodos) => [
  "You are maintaining a user's master lists of goals, good habits, bad habits, and a todo list based on their daily conversations with their AI companion Avyaa.",
  "",
  "Current master lists:",
  `goals: ${JSON.stringify(currentGoals)}`,
  `goodHabits: ${JSON.stringify(currentGoodHabits)}`,
  `badHabits: ${JSON.stringify(currentBadHabits)}`,
  "",
  "Current open todos (each has an id and text):",
  JSON.stringify(currentOpenTodos),
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
  "For the todo list:",
  "- Extract any new tasks, action items, or things the user wants to do that are mentioned in the conversation.",
  "- Review the current open todos and identify any that the user mentioned completing, finishing, or no longer needing — return their ids in closedTodoIds.",
  "- Do not re-add todos that already exist in the open list.",
  "- Only add concrete actionable tasks, not vague intentions.",
  "",
  "Return a JSON object with exactly these fields:",
  "- \"goals\": Updated array of the user's goals and resolutions.",
  "- \"goodHabits\": Updated array of the user's positive habits.",
  "- \"badHabits\": Updated array of the user's negative habits they want to address.",
  "- \"todos\": Object with two fields:",
  "    - \"closedIds\": Array of ids from current open todos that should be marked as done.",
  "    - \"newItems\": Array of new todo task strings to add.",
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

      // Read current master lists and todo list
      const [goalsSnap, goodHabitsSnap, badHabitsSnap, todoSnap] = await Promise.all([
        db.collection("goals").doc(email).get(),
        db.collection("goodhabits").doc(email).get(),
        db.collection("badhabits").doc(email).get(),
        db.collection("todo").doc(email).get(),
      ]);

      const currentGoals = goalsSnap.exists ? (goalsSnap.data().items ?? []) : [];
      const currentGoodHabits = goodHabitsSnap.exists ? (goodHabitsSnap.data().items ?? []) : [];
      const currentBadHabits = badHabitsSnap.exists ? (badHabitsSnap.data().items ?? []) : [];
      const currentTodos = todoSnap.exists ? (todoSnap.data().items ?? []) : [];
      const currentOpenTodos = currentTodos
          .filter((t) => t.status === "open")
          .map((t) => ({id: t.id, text: t.text}));

      const transcriptText = transcript
          .map((m) => `${m.role === "model" ? "Avyaa" : "User"}: ${m.text}`)
          .join("\n");

      let goals = currentGoals;
      let goodHabits = currentGoodHabits;
      let badHabits = currentBadHabits;
      let todosUpdate = {closedIds: [], newItems: []};

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {responseMimeType: "application/json"},
        });
        const result = await model.generateContent(
            buildInsightsPrompt(transcriptText, currentGoals, currentGoodHabits, currentBadHabits, currentOpenTodos),
        );
        const raw = result.response.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          goals = Array.isArray(parsed.goals) ? parsed.goals : currentGoals;
          goodHabits = Array.isArray(parsed.goodHabits) ? parsed.goodHabits : currentGoodHabits;
          badHabits = Array.isArray(parsed.badHabits) ? parsed.badHabits : currentBadHabits;
          if (parsed.todos && typeof parsed.todos === "object") {
            todosUpdate = {
              closedIds: Array.isArray(parsed.todos.closedIds) ? parsed.todos.closedIds : [],
              newItems: Array.isArray(parsed.todos.newItems) ? parsed.todos.newItems : [],
            };
          }
        }
      } catch (err) {
        logger.error("extractUserInsights: Gemini extraction failed", {err: err.message, email, dateKey});
        return;
      }

      // Apply todo updates: close identified todos, append new ones
      const closedIdSet = new Set(todosUpdate.closedIds);
      const updatedTodos = currentTodos.map((t) =>
        closedIdSet.has(t.id) && t.status === "open" ?
          {...t, status: "closed", closedAt: now} :
          t,
      );
      for (const text of todosUpdate.newItems) {
        if (text && typeof text === "string") {
          updatedTodos.push({
            id: randomUUID(),
            text: text.trim(),
            status: "open",
            createdAt: now,
            closedAt: null,
          });
        }
      }

      // Compute daily progress by comparing old vs new lists
      const computeProgress = (oldItems, newItems) => {
        const oldSet = new Set(oldItems);
        const newSet = new Set(newItems);
        return {
          newItems: newItems.filter((i) => !oldSet.has(i)),
          resolvedItems: oldItems.filter((i) => !newSet.has(i)),
          continuedItems: newItems.filter((i) => oldSet.has(i)),
        };
      };

      const goalsProgress = computeProgress(currentGoals, goals);
      const goodHabitsProgress = computeProgress(currentGoodHabits, goodHabits);
      const badHabitsProgress = computeProgress(currentBadHabits, badHabits);

      // Write updated master lists and daily progress snapshots
      const batch = db.batch();

      const goalsRef = db.collection("goals").doc(email);
      batch.set(goalsRef, {
        items: goals,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });
      batch.set(goalsRef.collection("daily").doc(dateKey), {
        items: goals,
        ...goalsProgress,
        timestamp: now,
      });

      const goodHabitsRef = db.collection("goodhabits").doc(email);
      batch.set(goodHabitsRef, {
        items: goodHabits,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });
      batch.set(goodHabitsRef.collection("daily").doc(dateKey), {
        items: goodHabits,
        ...goodHabitsProgress,
        timestamp: now,
      });

      const badHabitsRef = db.collection("badhabits").doc(email);
      batch.set(badHabitsRef, {
        items: badHabits,
        lastUpdated: now,
        lastSessionDate: dateKey,
      });
      batch.set(badHabitsRef.collection("daily").doc(dateKey), {
        items: badHabits,
        ...badHabitsProgress,
        timestamp: now,
      });

      batch.set(db.collection("todo").doc(email), {
        items: updatedTodos,
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
        goalsNew: goalsProgress.newItems.length,
        goalsResolved: goalsProgress.resolvedItems.length,
        goodHabitsNew: goodHabitsProgress.newItems.length,
        badHabitsNew: badHabitsProgress.newItems.length,
        todosNew: todosUpdate.newItems.length,
        todosClosed: todosUpdate.closedIds.length,
        todosTotal: updatedTodos.length,
      });
    },
);
