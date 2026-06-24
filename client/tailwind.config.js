/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        gov: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#b9dcfe",
          300: "#7bbffe",
          400: "#369ef9",
          500: "#0c80eb",
          600: "#0062c9",
          700: "#014ea3",
          800: "#064385",
          900: "#0b3a6f",
          950: "#07224a",
        },
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
