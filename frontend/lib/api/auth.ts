// Auth API calls — implemented in Phase 4
import { apiClient } from "./client";
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>("/auth/register", data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data),

  me: () => apiClient.get("/auth/me"),
};
