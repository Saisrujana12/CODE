import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";

import { config, extraStandoutFeatures, productFeatures, serviceFlags } from "./config.js";
import { listSupportedLanguages } from "./constants/languages.js";
import { createReview, getHistorySnapshot, getReviewOptions } from "./services/reviewService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.resolve(__dirname, "../public");

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDirectory));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    appName: config.appName,
    time: new Date().toISOString(),
    services: serviceFlags
  });
});

app.get("/api/config", (_request, response) => {
  response.json({
    appName: config.appName,
    languages: listSupportedLanguages(),
    features: productFeatures,
    standoutFeatures: extraStandoutFeatures,
    services: serviceFlags,
    options: getReviewOptions()
  });
});

app.get("/api/history", (_request, response) => {
  response.json(getHistorySnapshot());
});

app.post("/api/review", async (request, response) => {
  try {
    const review = await createReview({
      code: request.body.code,
      preferredLanguage: request.body.language,
      focusAreas: Array.isArray(request.body.focusAreas) ? request.body.focusAreas : [],
      reviewMode: request.body.reviewMode || "mentor"
    });

    response.json(review);
  } catch (error) {
    response.status(400).json({
      message: error.message || "Unable to review the supplied code."
    });
  }
});

app.get("*", (_request, response) => {
  response.sendFile(path.resolve(publicDirectory, "index.html"));
});

export default app;
