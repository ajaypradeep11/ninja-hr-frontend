import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (shadcn convention) — flip automatically in .dark.
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        // Brand palette (vivid indigo/violet). The subtle end (50–200) is
        // var-backed so chip/hover backgrounds flip in dark mode; the
        // saturated end stays static (buttons, gradients, focus borders).
        brand: {
          50: "hsl(var(--brand-50) / <alpha-value>)",
          100: "hsl(var(--brand-100) / <alpha-value>)",
          200: "hsl(var(--brand-200) / <alpha-value>)",
          300: "#aaa4f7",
          400: "#8b7ff1",
          500: "#6d5ce7", // primary buttons / active nav
          600: "#5b46d6",
          700: "#4d39b8",
          800: "#402f96",
          900: "#362a78",
        },
        // Legacy names kept as aliases of the semantic tokens so existing
        // classes (text-ink, bg-canvas, border-line) theme automatically.
        ink: {
          DEFAULT: "hsl(var(--foreground) / <alpha-value>)",
          soft: "hsl(var(--foreground-soft) / <alpha-value>)",
          muted: "hsl(var(--muted-foreground) / <alpha-value>)",
          faint: "hsl(var(--foreground-faint) / <alpha-value>)",
        },
        canvas: "hsl(var(--muted) / <alpha-value>)",
        line: "hsl(var(--border) / <alpha-value>)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        "card-lg": "0 4px 16px rgba(16,24,40,0.06), 0 2px 4px rgba(16,24,40,0.04)",
        pop: "0 10px 30px rgba(16,24,40,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
