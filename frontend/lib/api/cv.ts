// CV API calls — implemented in Phase 4
import { apiClient } from "./client";

export const cvApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post("/cv/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getLatest: () => apiClient.get("/cv/latest"),

  getSkills: (id: string) => apiClient.get(`/cv/${id}/skills`),
};
