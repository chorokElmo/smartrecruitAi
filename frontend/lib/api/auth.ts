import { apiClient } from "./client";
import type { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";
import type { User } from "@/types/user";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<User>("/auth/register", data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>("/auth/login", data),

  me: () => apiClient.get<User>("/auth/me"),
};
