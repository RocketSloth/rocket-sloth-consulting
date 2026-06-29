import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0e1a17", deep: "#0a1411" },
        panel: { DEFAULT: "#142420", strong: "#1a2c27" },
        ink: { DEFAULT: "#f1ede4", dim: "#b6c3bd", faint: "#7a8c83" },
        brand: { DEFAULT: "#4a8474", deep: "#356b5b", soft: "#21413a" },
        mountain: "#6c8a9c",
        salmon: "#6da896",
        line: "rgba(165, 195, 180, 0.12)",
        "line-strong": "rgba(165, 195, 180, 0.22)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 28px 70px rgba(0, 0, 0, 0.42)",
      },
      borderColor: {
        DEFAULT: "rgba(165, 195, 180, 0.12)",
      },
      backgroundImage: {
        "forest-radial":
          "radial-gradient(ellipse at 50% 0%, #16241f 0%, #0a1411 55%, #06100d 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
