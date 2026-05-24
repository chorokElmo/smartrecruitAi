// Recommendations API calls — implemented in Phase 4
import { apiClient } from "./client";

export const recommendationsApi = {
  getAll: () => apiClient.get("/recommendations"),

  generate: () => apiClient.post("/recommendations/generate"),
};
