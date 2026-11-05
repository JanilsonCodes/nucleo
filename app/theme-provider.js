"use client";

import { useEffect } from "react";

const DEFAULT_THEME = {
  mode: "dark",
  primary: "#E9EFA6",
  secondary: "#D7D5FF",
  background: "#111111",
};

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const safe = { ...DEFAULT_THEME, ...(theme || {}) };
  root.dataset.theme = safe.mode === "light" ? "light" : "dark";
  root.style.setProperty("--accent", safe.primary);
  root.style.setProperty("--accent-2", safe.secondary);
  root.style.setProperty("--user-bg", safe.background);
  root.style.setProperty("--accent-rgb", hexToRgb(safe.primary));
}

function hexToRgb(hex) {
  const value = String(hex || "#E9EFA6").replace("#", "");
  const full = value.length === 3 ? value.split("").map(x => x + x).join("") : value;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return "233, 239, 166";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default function ThemeProvider({ children }) {
  useEffect(() => {
    try {
      applyTheme(JSON.parse(localStorage.getItem("nucleo-theme-config") || "null"));
    } catch {
      applyTheme(DEFAULT_THEME);
    }

    const sync = () => {
      try {
        applyTheme(JSON.parse(localStorage.getItem("nucleo-theme-config") || "null"));
      } catch {
        applyTheme(DEFAULT_THEME);
      }
    };

    window.addEventListener("nucleo-theme-change", sync);
    return () => window.removeEventListener("nucleo-theme-change", sync);
  }, []);

  return children;
}
