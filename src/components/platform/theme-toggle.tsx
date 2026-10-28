"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
    // Read the actual theme from the <html> class (set by next-themes before
    // hydration). This avoids any SSR/CSR mismatch on the aria-label.
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    setTheme(next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      // Static aria-label — never depends on theme state, so no hydration
      // mismatch between SSR and first client render.
      aria-label="Toggle color theme"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        <div className="h-4 w-4" />
      )}
    </button>
  );
}
