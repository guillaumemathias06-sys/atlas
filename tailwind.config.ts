import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        atlas: {
          bg: "#05070d",
          panel: "#0b1020",
          panel2: "#0f1630",
          border: "#1e2947",
          line: "#22315a",
          text: "#e7ecf9",
          muted: "#8b96b8",
          accent: "#3fd6c9", // cyan aviation
          accent2: "#7c8fff", // indigo
          gold: "#f2c14e", // deals exceptionnels
          danger: "#ff6b6b",
          good: "#4ade80",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "atlas-grid":
          "linear-gradient(rgba(63,214,201,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(63,214,201,0.06) 1px, transparent 1px)",
        "atlas-radial":
          "radial-gradient(circle at 20% 0%, rgba(124,143,255,0.18), transparent 45%), radial-gradient(circle at 80% 10%, rgba(63,214,201,0.14), transparent 40%)",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px -20px rgba(0,0,0,0.6)",
        glow: "0 0 30px -6px rgba(63,214,201,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
