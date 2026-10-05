import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        gold: "#F5C518",
        "gold-light": "#FFE066",
        "festive-red": "#E11D48",
        "festive-red-deep": "#9F1239",
        navy: "#0E1333",
        plum: "#1A0F2E",
        cream: "#FDF6E9",
        card: "#FFFFFF",
      },
      borderRadius: {
        card: "1.25rem",
        pill: "999px",
      },
      boxShadow: {
        card: "0 6px 20px rgba(14, 19, 51, 0.10)",
        "card-hover": "0 16px 40px rgba(14, 19, 51, 0.22)",
        glow: "0 0 32px rgba(245, 197, 24, 0.35)",
      },
      fontFamily: {
        sans: [
          "var(--font-poppins)",
          "Poppins",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
