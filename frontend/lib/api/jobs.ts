import { apiClient } from "./client";

export const jobsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get("/jobs", { params }),

  getById: (id: string) => apiClient.get(`/jobs/${id}`),

  save:   (id: string) => apiClient.post(`/jobs/${id}/save`),
  unsave: (id: string) => apiClient.delete(`/jobs/${id}/save`),

  getSaved: () => apiClient.get("/jobs/saved"),

  coverLetter: (id: string) => apiClient.post(`/jobs/${id}/cover-letter`),

  // Application tracking
  getApplied:   ()          => apiClient.get("/jobs/applied"),
  markApplied:  (id: string) => apiClient.post(`/jobs/${id}/apply`),
  unmarkApplied:(id: string) => apiClient.delete(`/jobs/${id}/apply`),
};
