import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          dark: "rgb(var(--brand-dark) / <alpha-value>)",
          accent: "rgb(var(--accent) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
