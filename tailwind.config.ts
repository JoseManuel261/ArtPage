import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "punk-black": "#0a0a0a",
        "punk-pink": "#ff007f",
        "punk-cyan": "#00f3ff",
        "punk-yellow": "#f5ff00",
        "punk-paper": "#e8e4d8",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
        glitch: ["'Archivo Black'", "sans-serif"],
      },
      animation: {
        glitch: "glitch 0.6s infinite",
        scanline: "scanline 8s linear infinite",
        flicker: "flicker 3s infinite",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-2px,2px)" },
          "40%": { transform: "translate(-2px,-2px)" },
          "60%": { transform: "translate(2px,2px)" },
          "80%": { transform: "translate(2px,-2px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.4" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.6" },
          "97%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
