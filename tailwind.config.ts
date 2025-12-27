import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#37352f",
        muted: "#9b9a97",
        border: "#e9e9e7",
        accent: "#f7f6f3",
        success: "#0f7b0f",
        warning: "#d97706",
        error: "#dc2626",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
          '"Noto Sans Thai"',
          '"Sarabun"',
        ],
      },
    },
  },
  plugins: [],
};
export default config;

