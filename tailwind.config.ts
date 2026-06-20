import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the mockups (vivid indigo/violet)
        brand: {
          50: "#f1f0fe",
          100: "#e5e3fd",
          200: "#cdcafb",
          300: "#aaa4f7",
          400: "#8b7ff1",
          500: "#6d5ce7", // primary buttons / active nav
          600: "#5b46d6",
          700: "#4d39b8",
          800: "#402f96",
          900: "#362a78",
        },
        ink: {
          DEFAULT: "#1e2230",
          soft: "#3a4051",
          muted: "#6b7280",
          faint: "#9ca3af",
        },
        canvas: "#f6f7f9",
        line: "#eceef2",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
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
