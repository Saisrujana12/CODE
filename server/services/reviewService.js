import crypto from "node:crypto";

import { detectLanguage } from "../constants/languages.js";
import { generateAiReview } from "./openAiReviewer.js";
import { generateHeuristicReview } from "./heuristicReviewer.js";
import { chromaService } from "./chromaService.js";
import { addHistoryItem, getHistoryStats, listHistoryItems } from "./historyStore.js";
import { serviceFlags } from "../config.js";

const REVIEW_MODES = [
  {
    id: "mentor",
    label: "Mentor mode",
    detail: "Supportive review with clear explanations."
  },
  {
    id: "strict",
    label: "Strict mode",
    detail: "Sharper critique focused on problems and missing rigor."
  },
  {
    id: "ship",
    label: "Ship-ready mode",
    detail: "Bias toward release blockers, reliability, and production safety."
  },
  {
    id: "interview",
    label: "Interview mode",
    detail: "Highlights clarity, fundamentals, and teachable syntax decisions."
  }
];

const FOCUS_AREAS = [
  { id: "security", label: "Security" },
  { id: "performance", label: "Performance" },
  { id: "readability", label: "Readability" },
  { id: "architecture", label: "Architecture" },
  { id: "testing", label: "Testing" }
];

const mergeArray = (baseValue, overrideValue) =>
  Array.isArray(overrideValue) && overrideValue.length ? overrideValue : baseValue;

const mergeObjects = (baseObject, overrideObject) => ({
  ...baseObject,
  ...(overrideObject || {})
});

const mergeReviewPayloads = (baseReview, aiReview) => ({
  ...baseReview,
  ...aiReview,
  overview: mergeObjects(baseReview.overview, aiReview.overview),
  metrics: mergeObjects(baseReview.metrics, aiReview.metrics),
  advantages: mergeArray(baseReview.advantages, aiReview.advantages),
  disadvantages: mergeArray(baseReview.disadvantages, aiReview.disadvantages),
  syntaxNotes: mergeArray(baseReview.syntaxNotes, aiReview.syntaxNotes),
  suggestions: mergeArray(baseReview.suggestions, aiReview.suggestions),
  roadmap: mergeArray(baseReview.roadmap, aiReview.roadmap),
  highlightedLines: mergeArray(baseReview.highlightedLines, aiReview.highlightedLines),
  nextExperiments: mergeArray(baseReview.nextExperiments, aiReview.nextExperiments),
  memoryMatches: mergeArray(baseReview.memoryMatches, aiReview.memoryMatches)
});

export const getReviewOptions = () => ({
  reviewModes: REVIEW_MODES,
  focusAreas: FOCUS_AREAS
});

export const getHistorySnapshot = () => ({
  items: listHistoryItems(),
  stats: getHistoryStats()
});

export const createReview = async ({
  code,
  preferredLanguage,
  focusAreas = [],
  reviewMode = "mentor"
}) => {
  const normalizedCode = `${code || ""}`.trimEnd();

  if (!normalizedCode.trim()) {
    throw new Error("Please paste code before requesting a review.");
  }

  const detectedLanguage = detectLanguage(normalizedCode, preferredLanguage);
  const memoryMatches = await chromaService.findSimilarReviews({
    code: normalizedCode,
    language: detectedLanguage.id
  });

  const heuristicReview = generateHeuristicReview({
    code: normalizedCode,
    languageId: detectedLanguage.id,
    focusAreas,
    reviewMode,
    memoryMatches
  });

  let finalReview = heuristicReview;
  let aiSource = "heuristic";
  let fallbackReason = "";

  if (serviceFlags.aiEnabled) {
    try {
      const aiReview = await generateAiReview({
        code: normalizedCode,
        language: detectedLanguage.label,
        reviewMode,
        focusAreas,
        memoryMatches,
        baseline: heuristicReview
      });

      finalReview = mergeReviewPayloads(heuristicReview, aiReview);
      aiSource = "openai";
    } catch (error) {
      fallbackReason = error.message;
    }
  }

  const review = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    language: detectedLanguage.id,
    languageLabel: detectedLanguage.label,
    detectionConfidence: detectedLanguage.confidence,
    reviewMode,
    focusAreas,
    aiSource,
    usedFallback: aiSource !== "openai",
    fallbackReason,
    code: normalizedCode,
    ...finalReview
  };

  addHistoryItem({
    id: review.id,
    createdAt: review.createdAt,
    title: review.title,
    summary: review.summary,
    score: review.score,
    riskLevel: review.riskLevel,
    language: review.language,
    languageLabel: review.languageLabel,
    reviewMode: review.reviewMode,
    aiSource: review.aiSource
  });

  const chromaStatus = await chromaService.addReview(review);

  return {
    ...review,
    chromaStored: chromaStatus.stored,
    chromaMessage: chromaStatus.stored ? "Saved to Chroma memory." : chromaStatus.reason
  };
};
