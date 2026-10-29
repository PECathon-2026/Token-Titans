import { useSyncExternalStore } from "react";

const KEY = "swr-theme";
export type Theme = "light" | "dark";

/** Seeded by the blocking script in __root.tsx, so hydration sees the same class the DOM already has. */
function bootTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const seeded = (window as { __SWR_THEME?: string }).__SWR_THEME;
  return seeded === "dark" || seeded === "light" ? seeded : "light";
}

const listeners = new Set<() => void>();
let current: Theme = bootTheme();
let watchingSystem = false;

/** Plain read for render-time use (RootShell) — matches the class the boot script painted. */
export function currentTheme(): Theme {
  return current;
}

function systemDark() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

/** The reader's saved choice, or the system one until they choose. */
export function preferredTheme(): Theme {
  return stored() ?? (systemDark() ? "dark" : "light");
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function emit() {
  for (const listener of listeners) listener();
}

export function setTheme(theme: Theme) {
  current = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private browsing: the choice just lives for this visit */
  }
  applyTheme(theme);
  emit();
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

/** Read the saved choice (or the system one) and paint it. Call once on mount. */
export function syncTheme() {
  current = preferredTheme();
  applyTheme(current);
  emit();
  if (watchingSystem || typeof window === "undefined" || !window.matchMedia) return;
  watchingSystem = true;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (stored()) return; // an explicit choice always wins
    current = e.matches ? "dark" : "light";
    applyTheme(current);
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot() {
  return "light" as Theme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme, toggleTheme };
}
