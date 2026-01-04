export type AppTheme = "dark" | "light";

export const APP_THEME_STORAGE_KEY = "omnifaind_theme";
const FALLBACK_THEME: AppTheme = "dark";

export const resolveStoredTheme = (): AppTheme => {
  if (typeof window === "undefined") {
    return FALLBACK_THEME;
  }
  const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  const prefersLight =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  if (prefersLight) {
    return "light";
  }
  return FALLBACK_THEME;
};

export const persistThemePreference = (theme: AppTheme) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
};

export const applyThemePreference = (theme: AppTheme) => {
  if (typeof document === "undefined") return;
  document.body.dataset.appTheme = theme;
};

export const toggleThemeValue = (current: AppTheme): AppTheme =>
  current === "dark" ? "light" : "dark";
