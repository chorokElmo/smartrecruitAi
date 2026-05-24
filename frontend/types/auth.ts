export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

// Backend returns token only; user is fetched via /auth/me
export interface AuthResponse {
  access_token: string;
  token_type: string;
}
