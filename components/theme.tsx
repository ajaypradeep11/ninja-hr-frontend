"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Render a stable placeholder until mounted — resolvedTheme is unknown on
  // the server, and mismatched sun/moon icons trigger hydration errors.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={
        mounted && resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className={
        "rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink " +
        (className ?? "")
      }
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
