import { useState, useEffect } from "react";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return !document.documentElement.classList.contains("light");
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="px-2 py-1 text-[10px] border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors rounded tracking-wider"
      aria-label="Toggle theme"
    >
      {isDark ? "☀ LIGHT" : "● DARK"}
    </button>
  );
};

export default ThemeToggle;
