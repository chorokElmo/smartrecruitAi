import { apiClient } from "./client";

export const jobsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get("/jobs", { params }),

  getById: (id: string) => apiClient.get(`/jobs/${id}`),

  filters: () => apiClient.get("/jobs/filters"),

  save:   (id: string) => apiClient.post(`/jobs/${id}/save`),
  unsave: (id: string) => apiClient.delete(`/jobs/${id}/save`),

  getSaved: () => apiClient.get("/jobs/saved"),

  coverLetter: (id: string) => apiClient.post(`/jobs/${id}/cover-letter`),

  // Application tracking
  getApplied:     ()          => apiClient.get("/jobs/applied"),
  getAppliedFull: ()          => apiClient.get("/jobs/applied/full"),
  markApplied:    (id: string) => apiClient.post(`/jobs/${id}/apply`),
  unmarkApplied:  (id: string) => apiClient.delete(`/jobs/${id}/apply`),
};

export const applicationsApi = {
  list:         ()                              => apiClient.get("/applications"),
  updateStatus: (id: string, status: string)   => apiClient.patch(`/applications/${id}/status`, { status }),
};
