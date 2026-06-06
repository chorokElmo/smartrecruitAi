import { apiClient } from "./client";

export const recommendationsApi = {
  getAll: () => apiClient.get("/recommendations"),

  generate: () => apiClient.post("/recommendations/generate"),

  /** Live scrape + Groq AI match — always fresh from websites */
  liveMatch: (pages = 3) =>
    apiClient.post("/recommendations/live-match", null, { params: { pages } }),

  advice: (force = false) =>
    apiClient.get("/recommendations/advice", { params: force ? { force: true } : {} }),
};
