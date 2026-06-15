import { apiClient } from "./client";

export const recommendationsApi = {
  getAll: (minScore = 100) =>
    apiClient.get("/recommendations", { params: { min_score: minScore } }),

  generate: () => apiClient.post("/recommendations/generate"),

  /** Live scrape + Groq AI match — always fresh from websites */
  liveMatch: (pages = 6) =>
    apiClient.post("/recommendations/live-match", null, { params: { pages } }),

  history: () => apiClient.get("/recommendations/history"),

  advice: (force = false) =>
    apiClient.get("/recommendations/advice", { params: force ? { force: true } : {} }),
};
