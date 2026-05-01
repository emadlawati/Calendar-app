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
        "milk-white": "#fdfbf7",
        "blush-pink": "#fce4ec",
        "soft-peach": "#ffeedb",
        "latte-brown": "#d7ccc8",
        "text-dark": "#5d4037",
      },
      fontFamily: {
        sniglet: ["var(--font-sniglet)", "cursive"],
        quicksand: ["var(--font-quicksand)", "sans-serif"],
      },
      borderRadius: {
        "extreme": "2rem",
      },
      boxShadow: {
        "plush": "0 10px 25px -5px rgba(215, 204, 200, 0.5), 0 8px 10px -6px rgba(215, 204, 200, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
