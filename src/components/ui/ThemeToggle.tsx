"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme-preference";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Theme | null)) || null;
    const initial: Theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    apply(initial);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    if (typeof document !== "undefined") {
      const el = document.documentElement;
      el.classList.toggle("theme-dark", next === "dark");
    }
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded border border-muted px-3 py-1.5 text-sm hover:opacity-90 transition"
    >
      <span className="i">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
