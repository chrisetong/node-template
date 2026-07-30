import { defineStore } from "pinia";
import { api } from "../api";

export type PublicSystemSetting = {
  siteName: string;
  loginLogoPath: string;
  loginDescription: string;
  loginBackgroundPath: string;
  filingText: string;
  filingUrl: string;
};

export const DEFAULT_SYSTEM_SETTING: PublicSystemSetting = {
  siteName: "澄序",
  loginLogoPath: `${import.meta.env.BASE_URL}favicon.svg`,
  loginDescription: "把复杂事务，整理成清晰进展。",
  loginBackgroundPath: "",
  filingText: "",
  filingUrl: "",
};

const emptySetting = (): PublicSystemSetting => ({
  siteName: "",
  loginLogoPath: "",
  loginDescription: "",
  loginBackgroundPath: "",
  filingText: "",
  filingUrl: "",
});

export function isEmptySystemSetting(setting: PublicSystemSetting): boolean {
  return Object.values(setting).every((value) => !value.trim());
}

function normalizeSetting(
  value: Partial<Record<keyof PublicSystemSetting, unknown>> | null | undefined,
): PublicSystemSetting {
  const fallback = emptySetting();
  for (const key of Object.keys(fallback) as (keyof PublicSystemSetting)[]) {
    const field = value?.[key];
    fallback[key] = typeof field === "string" ? field.trim() : "";
  }
  return fallback;
}

export function resolveAssetUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const base = String(api.defaults.baseURL ?? "").trim();
  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      return `${new URL(base).origin}${path}`;
    } catch {
      return `${base.replace(/\/$/, "")}${path}`;
    }
  }
  return `${window.location.origin}${path}`;
}

export const useSystemSettingStore = defineStore("system-setting", {
  state: () => ({
    setting: emptySetting(),
    loaded: false,
  }),
  getters: {
    isDefaultStyle: (state) => isEmptySystemSetting(state.setting),
    displaySiteName: (state) =>
      isEmptySystemSetting(state.setting)
        ? DEFAULT_SYSTEM_SETTING.siteName
        : state.setting.siteName,
    displayLoginDescription: (state) =>
      isEmptySystemSetting(state.setting)
        ? DEFAULT_SYSTEM_SETTING.loginDescription
        : state.setting.loginDescription,
    loginLogoUrl: (state) =>
      resolveAssetUrl(
        isEmptySystemSetting(state.setting)
          ? DEFAULT_SYSTEM_SETTING.loginLogoPath
          : state.setting.loginLogoPath,
      ),
    loginBackgroundUrl: (state) =>
      resolveAssetUrl(state.setting.loginBackgroundPath),
    hasLoginVisual(state): boolean {
      if (isEmptySystemSetting(state.setting)) return true;
      const setting = state.setting;
      return Boolean(
        setting.siteName ||
          setting.loginLogoPath ||
          setting.loginDescription ||
          setting.loginBackgroundPath,
      );
    },
    hasSidebarBrand(state): boolean {
      if (isEmptySystemSetting(state.setting)) return true;
      return Boolean(state.setting.siteName || state.setting.loginLogoPath);
    },
  },
  actions: {
    async loadPublic(force = false) {
      if (this.loaded && !force) return this.setting;
      const { data } =
        await api.get<Partial<PublicSystemSetting>>("/system-setting/public");
      this.setting = normalizeSetting(data);
      this.loaded = true;
      this.applyFavicon();
      return this.setting;
    },
    applyFavicon() {
      document
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
        .forEach((node) => node.remove());
      const href = this.loginLogoUrl;
      if (!href) return;
      const favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.href = href;
      favicon.dataset.systemSettingFavicon = "true";
      document.head.appendChild(favicon);
    },
    applyDocumentTitle(routeTitle = "") {
      const page = routeTitle.trim();
      const site = this.displaySiteName.trim();
      document.title = page && site ? `${page} - ${site}` : page || site;
    },
  },
});
