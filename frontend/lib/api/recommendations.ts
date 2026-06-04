import { apiClient } from "./client";

export const recommendationsApi = {
  getAll: () => apiClient.get("/recommendations"),

  generate: () => apiClient.post("/recommendations/generate"),

  advice: (force = false) =>
    apiClient.get("/recommendations/advice", { params: force ? { force: true } : {} }),
};
