import axios from "axios";

// Same-origin: the browser always hits the frontend host, and Next.js
// rewrites /api/v1/* to the backend server-side. Works through a single
// tunnel (no second port, no CORS). Override with NEXT_PUBLIC_API_URL if needed.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Debug helper — remove before production
if (typeof window !== "undefined") {
  (window as any).__checkToken = () => {
    const t = localStorage.getItem("access_token");
    console.log("Token:", t ? t.substring(0, 40) + "..." : "MISSING");
  };
}
