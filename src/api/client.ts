import axios, { AxiosError } from "axios";

import { useAuth } from "@/store/auth";

/** База для admin-api: VITE_API_URL — корень API (http://host:8000) или уже с суффиксом /admin-api. */
function adminApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (!raw) return "/admin-api";
  if (raw.endsWith("/admin-api")) return raw;
  return `${raw}/admin-api`;
}

const baseURL = adminApiBaseUrl();

export const api = axios.create({
  baseURL,
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Не вылогинивать если уже на экране логина
      if (useAuth.getState().token) {
        useAuth.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export function extractError(err: unknown, fallback = "Что-то пошло не так"): string {
  const e = err as AxiosError<{ detail?: string | { msg?: string }[] }>;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (e?.message) return e.message;
  return fallback;
}
