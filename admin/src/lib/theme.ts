export type ThemeMode = "light" | "dark";

const THEME_KEY = "theme";

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)",
  )?.matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  localStorage.setItem(THEME_KEY, mode);
}

export function getAppliedTheme(): ThemeMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function initTheme() {
  applyTheme(getTheme());
}

export function toggleTheme(): ThemeMode {
  const next = getAppliedTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
