/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f1117",
          secondary: "#1a1d2e",
          tertiary: "#252940",
        },
        accent: {
          blue: "#6366f1",
          purple: "#8b5cf6",
          green: "#10b981",
          orange: "#f59e0b",
          red: "#ef4444",
          cyan: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
};
