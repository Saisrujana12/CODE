import { config, serviceFlags } from "../config.js";
import { embedText } from "./embeddingService.js";

const COLLECTION_NAME = "codepulse_review_memory";

class ChromaService {
  constructor() {
    this.collectionId = null;
  }

  get enabled() {
    return serviceFlags.chromaEnabled;
  }

  async request(path, options = {}) {
    const response = await fetch(`${config.chromaHost}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "x-chroma-token": config.chromaApiKey,
        ...(options.headers || {})
      },
      body: options.body
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Chroma request failed (${response.status}): ${message}`);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async ensureCollection() {
    if (!this.enabled) {
      return null;
    }

    if (this.collectionId) {
      return this.collectionId;
    }

    const data = await this.request(
      `/api/v2/tenants/${encodeURIComponent(config.chromaTenant)}/databases/${encodeURIComponent(config.chromaDatabase)}/collections`,
      {
        method: "POST",
        body: JSON.stringify({
          name: COLLECTION_NAME,
          get_or_create: true,
          metadata: {
            application: "CodePulse AI",
            purpose: "review_memory"
          }
        })
      }
    );

    this.collectionId = data.id;
    return this.collectionId;
  }

  async addReview(review) {
    if (!this.enabled) {
      return { stored: false, reason: "Chroma not configured." };
    }

    try {
      const collectionId = await this.ensureCollection();

      await this.request(
        `/api/v2/tenants/${encodeURIComponent(config.chromaTenant)}/databases/${encodeURIComponent(config.chromaDatabase)}/collections/${collectionId}/add`,
        {
          method: "POST",
          body: JSON.stringify({
            ids: [review.id],
            embeddings: [embedText(`${review.language}\n${review.summary}\n${review.code}`)],
            documents: [
              JSON.stringify({
                summary: review.summary,
                title: review.title,
                score: review.score,
                riskLevel: review.riskLevel,
                language: review.language,
                suggestions: review.suggestions.slice(0, 3).map((item) => item.title)
              })
            ],
            metadatas: [
              {
                reviewId: review.id,
                language: review.language,
                score: review.score,
                riskLevel: review.riskLevel,
                reviewMode: review.reviewMode,
                createdAt: review.createdAt
              }
            ]
          })
        }
      );

      return { stored: true };
    } catch (error) {
      return {
        stored: false,
        reason: error.message
      };
    }
  }

  async findSimilarReviews({ code, language, limit = 3 }) {
    if (!this.enabled) {
      return [];
    }

    try {
      const collectionId = await this.ensureCollection();

      const requestBody = {
        query_embeddings: [embedText(code)],
        n_results: limit,
        include: ["documents", "metadatas", "distances"]
      };

      if (language && language !== "unknown") {
        requestBody.where = { language };
      }

      const data = await this.request(
        `/api/v2/tenants/${encodeURIComponent(config.chromaTenant)}/databases/${encodeURIComponent(config.chromaDatabase)}/collections/${collectionId}/query`,
        {
          method: "POST",
          body: JSON.stringify(requestBody)
        }
      );

      const documents = data.documents?.[0] || [];
      const metadatas = data.metadatas?.[0] || [];
      const distances = data.distances?.[0] || [];

      return documents
        .map((document, index) => {
          try {
            const parsed = JSON.parse(document);
            return {
              id: metadatas[index]?.reviewId || `memory-${index}`,
              distance: Number((distances[index] || 0).toFixed(3)),
              language: parsed.language || metadatas[index]?.language || "unknown",
              score: parsed.score || metadatas[index]?.score || 0,
              riskLevel: parsed.riskLevel || metadatas[index]?.riskLevel || "medium",
              title: parsed.title || "Previous review",
              summary: parsed.summary || "",
              suggestions: parsed.suggestions || []
            };
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }
}

export const chromaService = new ChromaService();
