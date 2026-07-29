import axios from "axios";
import type { Router } from "vue-router";
import { toast } from "../components/ui/toast";

const env = (import.meta as any).env || {};
const API_BASE_URL = env.VITE_API_BASE_URL || "/api";
const ACCESS_TOKEN_KEY = "token";
const CURRENT_USER_KEY = "currentUser";
const MENU_TREE_KEY = "menuTree";
const PERMISSIONS_KEY = "permissions";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

export function setAccessToken(token: string | null, remember = false) {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  if (token) {
    (remember ? localStorage : sessionStorage).setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
}

export function getAccessToken() {
  return (
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getAuthStorage(): Storage {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ? localStorage : sessionStorage;
}

export function clearAuthStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(CURRENT_USER_KEY);
    storage.removeItem(MENU_TREE_KEY);
    storage.removeItem(PERMISSIONS_KEY);
  }
}

type ApiEnvelope<T> = {
  code: number;
  data: T;
  message: string;
};

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.code === "number" &&
    "data" in record &&
    typeof record.message === "string"
  );
}

export function setupApiInterceptors(router: Router) {
  api.interceptors.request.use((config) => {
    const token = getAccessToken()?.trim();
    if (!token) return config;

    if (typeof (config.headers as any)?.set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${token}`);
      return config;
    }

    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      if (isApiEnvelope(response.data)) {
        response.data = response.data.data;
      }
      return response;
    },
    async (error) => {
      const status = error?.response?.status;
      const message =
        status === 401
          ? "登录已过期，请重新登录"
          : status === 403
            ? "当前账号无法完成此操作"
            : status && status >= 500
              ? "服务暂时不可用，请稍后重试"
              : "操作未完成，请检查信息后重试";

      const currentPath = router.currentRoute.value.fullPath;
      if (!currentPath.startsWith("/login")) {
        toast({
          title: status === 401 ? "请重新登录" : "操作未完成",
          description: message,
          variant: "destructive",
        });
      }

      if (status !== 401 && status !== 403) {
        return Promise.reject(error);
      }

      clearAuthStorage();

      if (!currentPath.startsWith("/login")) {
        await router.push({ name: "login" });
      }

      return Promise.reject(error);
    },
  );
}
