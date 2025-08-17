// src/config.ts
export type BackendProvider = "flask";

export const APP_CONFIG = {
  BACKEND_PROVIDER: "flask" as const,
  // Single source of truth for your Flask base URL (optional convenience)
  FLASK_URL:
    (typeof window !== "undefined" && (import.meta as any)?.env?.VITE_FLASK_URL) ||
    (typeof window !== "undefined" && localStorage.getItem("FLASK_API_URL")) ||
    "http://localhost:5000",
} as const;
