import { apiClient } from "./client";
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";
import type { User } from "@/types/user";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<User>("/auth/register", data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data),

  google: (idToken: string) =>
    apiClient.post<AuthResponse>("/auth/google", { id_token: idToken }),

  me: () => apiClient.get<User>("/auth/me"),

  registerFromCv: (form: FormData) =>
    apiClient.post<AuthResponse>("/auth/register-from-cv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  extractCv: (file: File) => {
    const fd = new FormData();
    fd.append("cv_file", file);
    return apiClient.post("/auth/extract-cv", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
