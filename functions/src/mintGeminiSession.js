const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

/**
 * Returns the Gemini API key to authenticated clients so the
 * real key is never exposed in the frontend bundle.
 * The key is loaded from functions/.env (GEMINI_API_KEY).
 */
exports.mintGeminiSession = onCall(
    {region: "asia-south1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Must be signed in to use Srishti.",
        );
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new HttpsError(
            "internal",
            "Gemini API key is not configured.",
        );
      }

      logger.info("Minting Gemini session token", {uid: request.auth.uid});
      return {apiKey: key};
    },
);
