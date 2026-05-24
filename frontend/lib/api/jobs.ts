// Jobs API calls — implemented in Phase 4
import { apiClient } from "./client";

export const jobsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get("/jobs", { params }),

  getById: (id: string) => apiClient.get(`/jobs/${id}`),

  save: (id: string) => apiClient.post(`/jobs/${id}/save`),

  unsave: (id: string) => apiClient.delete(`/jobs/${id}/save`),

  getSaved: () => apiClient.get("/jobs/saved"),
};
