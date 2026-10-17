import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutrizen:theme");
      const isLight = saved === "light";
      document.documentElement.classList.toggle("light", isLight);
      document.documentElement.classList.toggle("dark", !isLight);
      setLight(isLight);
    } catch {
      setLight(document.documentElement.classList.contains("light"));
    }
  }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    document.documentElement.classList.toggle("dark", !next);
    try {
      localStorage.setItem("nutrizen:theme", next ? "light" : "dark");
    } catch {
      /* Theme still works without storage. */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
      title={light ? "Mode gelap" : "Mode terang"}
      className="rounded-full border border-border p-2.5 transition-colors hover:bg-secondary"
    >
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
