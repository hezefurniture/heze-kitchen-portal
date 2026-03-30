import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7B2D5F",
          light: "#9B4D7F",
          dark: "#5A1B45",
        },
        accent: {
          DEFAULT: "#D4A843",
          light: "#E4C873",
        },
        header: "#1E1E2E",
        card: {
          DEFAULT: "#5A6B8A",
          light: "#6B7C9B",
        },
        success: "#4CAF50",
        warning: "#FF9800",
        scan: {
          green: "#00C853",
          yellow: "#FFD600",
        },
      },
    },
  },
  plugins: [],
};

export default config;
