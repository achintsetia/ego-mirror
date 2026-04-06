require("dotenv").config();

const {setGlobalOptions} = require("firebase-functions");
const {mintGeminiSession} = require("./src/mintGeminiSession");
const {saveSession} = require("./src/saveSession");

setGlobalOptions({maxInstances: 10, region: "asia-south1"});

exports.mintGeminiSession = mintGeminiSession;
exports.saveSession = saveSession;
